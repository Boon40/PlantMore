import { Router } from 'express'
import { createChat, deleteChat, updateChatTitle, setFavourite, getChat, listChats } from './chat.service.js'

const router = Router()

// List all chats
router.get('/', async (_req, res) => {
  try {
    const chats = await listChats()
    res.json(chats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Create chat
router.post('/', async (req, res) => {
  try {
    const { title } = req.body || {}
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' })
    const chat = await createChat(title.trim())
    res.status(201).json(chat)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Edit chat title
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { title } = req.body || {}
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' })
    const chat = await updateChatTitle(id, title.trim())
    if (!chat) return res.status(404).json({ error: 'not found' })
    res.json(chat)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete chat
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const deleted = await deleteChat(id)
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Set favourite
router.post('/:id/favorite', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const chat = await setFavourite(id, true)
    if (!chat) return res.status(404).json({ error: 'not found' })
    res.json(chat)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Remove favourite
router.delete('/:id/favorite', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const chat = await setFavourite(id, false)
    if (!chat) return res.status(404).json({ error: 'not found' })
    res.json(chat)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// (Optional) Get one chat
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const chat = await getChat(id)
    if (!chat) return res.status(404).json({ error: 'not found' })
    res.json(chat)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router


