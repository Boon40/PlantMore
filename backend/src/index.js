import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, dbHealth, ensureSchema } from './db.js'
import path from 'path'
import fs from 'fs'
import chatRouter from './modules/chat/chat.routes.js'
import messageRouter from './modules/message/message.routes.js'
import imageRouter from './modules/image/image.routes.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

// Static uploads
const uploadsDir = path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/health/db', async (_req, res) => {
  try {
    const ok = await dbHealth()
    res.json({ db: ok ? 'up' : 'down' })
  } catch (e) {
    res.status(500).json({ db: 'down', error: e.message })
  }
})

app.use('/api/chat', chatRouter)
app.use('/api/message', messageRouter)
app.use('/api/image', imageRouter)

ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
})


