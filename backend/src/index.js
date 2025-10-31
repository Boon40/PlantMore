import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Placeholder chat endpoint; wire to your model later
app.post('/api/chat', async (req, res) => {
  const { messages = [] } = req.body || {}
  const last = messages[messages.length - 1]
  const content = last?.content || 'Hello'
  return res.json({ reply: `Echo: ${content}` })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})


