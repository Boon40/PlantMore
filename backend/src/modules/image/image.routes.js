import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { createImage, listImagesByMessage, deleteImage, getImageById } from './image.service.js'
import { classifyImage, checkBioClipHealth } from './bioclip.service.js'
import { createMessage } from '../message/message.service.js'
import { pool } from '../../db.js'

const router = Router()

// Multer storage setup
const uploadsRoot = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${ts}-${Math.random().toString(36).slice(2,8)}${ext}`)
  }
})
const upload = multer({ storage })

// Create image
router.post('/', async (req, res) => {
  try {
    const { message_id, image_url } = req.body || {}
    const messageId = Number(message_id)
    if (!Number.isInteger(messageId)) return res.status(400).json({ error: 'message_id is required' })
    if (!image_url || typeof image_url !== 'string') return res.status(400).json({ error: 'image_url is required' })
    const row = await createImage(messageId, image_url)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// List images by message_id
router.get('/', async (req, res) => {
  try {
    const messageId = Number(req.query.message_id)
    if (!Number.isInteger(messageId)) return res.status(400).json({ error: 'message_id is required' })
    const rows = await listImagesByMessage(messageId)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete image
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const deleted = await deleteImage(id)
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Upload image file and create DB row
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const messageId = Number(req.body.message_id)
    if (!Number.isInteger(messageId)) return res.status(400).json({ error: 'message_id is required' })
    if (!req.file) return res.status(400).json({ error: 'file is required' })
    const publicUrl = `/uploads/${req.file.filename}`
    const row = await createImage(messageId, publicUrl)
    
    // Get chat_id from the message to create assistant response
    const msgRes = await pool.query('SELECT chat_id FROM message WHERE id = $1', [messageId])
    const chatId = msgRes.rows[0]?.chat_id
    
    // Optionally classify the image if auto_classify is enabled
    // Do this ASYNCHRONOUSLY so the upload response returns immediately
    const autoClassify = req.body.auto_classify === 'true' || req.body.auto_classify === true
    if (autoClassify && chatId) {
      // Don't await - let it run in the background
      const absolutePath = req.file.path
      console.log(`[BioClip] Queuing classification for: ${absolutePath}`)
      console.log(`[BioClip] Chat ID: ${chatId}, Message ID: ${messageId}`)
      
      // Run classification asynchronously without blocking the response
      // Use setImmediate with proper async handling
      setImmediate(() => {
        (async () => {
          try {
            console.log(`[BioClip] Starting classification for: ${absolutePath}`)
            const classification = await classifyImage(absolutePath)
            console.log(`[BioClip] Classification result:`, JSON.stringify(classification, null, 2))
            
            // Create assistant message with classification result
            if (classification.success) {
              const confidencePercent = (classification.confidence * 100).toFixed(0)
              let responseText = `🌿 I've identified this plant as **${classification.prediction}** (${confidencePercent}% confidence).\n\n`
              
              // Add top 3 alternatives if available
              if (classification.top_k && classification.top_k.length > 1) {
                responseText += 'Other possibilities:\n'
                classification.top_k.slice(1, 4).forEach((alt, idx) => {
                  const altConf = (alt.confidence * 100).toFixed(0)
                  responseText += `• ${alt.plant} (${altConf}%)\n`
                })
              }
              
              // Create assistant message
              console.log(`[BioClip] Creating assistant message for chat ${chatId}`)
              const assistantMsg = await createMessage(chatId, responseText)
              console.log(`[BioClip] Assistant message created:`, assistantMsg.id)
            } else {
              // Classification failed - log the error and create a helpful message
              console.error(`[BioClip] Classification failed:`, classification.error)
              const errorMsg = classification.error || 'Unknown error'
              // Don't show technical errors to users, just a friendly message
              console.log(`[BioClip] Creating error message for chat ${chatId}`)
              await createMessage(chatId, "🔍 I'm having trouble identifying this plant. Could you provide more details or try a clearer photo?")
            }
          } catch (classifyError) {
            // Don't fail the upload if classification fails
            console.error('[BioClip] Classification exception:', classifyError)
            console.error('[BioClip] Stack:', classifyError.stack)
            
            // Still create a helpful assistant message
            if (chatId) {
              console.log(`[BioClip] Creating error fallback message for chat ${chatId}`)
              await createMessage(chatId, "🔍 I'm having trouble identifying this plant right now. Please try again in a moment.")
            }
          }
        })().catch(err => {
          console.error('[BioClip] Unhandled error in classification:', err)
        })
      })
    }
    
    // Return immediately without waiting for classification
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Classify an uploaded image by ID
router.post('/:id/classify', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    
    // Get image from database
    const image = await getImageById(id)
    if (!image) {
      return res.status(404).json({ error: 'Image not found' })
    }
    
    // Convert relative URL to absolute path
    const imageUrl = image.image_url
    const absolutePath = imageUrl.startsWith('/uploads/')
      ? path.resolve(uploadsRoot, imageUrl.replace('/uploads/', ''))
      : path.resolve(uploadsRoot, path.basename(imageUrl))
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' })
    }
    
    const classification = await classifyImage(absolutePath)
    res.json(classification)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Health check for BioClip service
router.get('/bioclip/health', async (req, res) => {
  try {
    const health = await checkBioClipHealth()
    res.json(health)
  } catch (e) {
    res.status(500).json({ available: false, error: e.message })
  }
})

export default router


