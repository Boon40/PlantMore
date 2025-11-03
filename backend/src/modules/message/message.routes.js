import { Router } from 'express'
import { createMessage, listMessagesByChat, deleteMessage } from './message.service.js'

const router = Router()

// Create message
router.post('/', async (req, res) => {
  try {
    const { text, chat_id } = req.body || {}
    const chatId = Number(chat_id)
    if (!Number.isInteger(chatId)) return res.status(400).json({ error: 'chat_id is required' })
    if (typeof text !== 'string') return res.status(400).json({ error: 'text is required' })
    const msg = await createMessage(chatId, text)
    res.status(201).json(msg)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// List messages by chat_id
router.get('/', async (req, res) => {
  try {
    const chatId = Number(req.query.chat_id)
    if (!Number.isInteger(chatId)) return res.status(400).json({ error: 'chat_id is required' })
    const rows = await listMessagesByChat(chatId)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const deleted = await deleteMessage(id)
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router


