import { Router } from 'express'
import { createImage, listImagesByMessage, deleteImage } from './image.service.js'

const router = Router()

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

export default router


