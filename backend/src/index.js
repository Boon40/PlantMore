import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { pool, dbHealth } from './db.js'
import chatRouter from './modules/chat/chat.routes.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

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

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})


