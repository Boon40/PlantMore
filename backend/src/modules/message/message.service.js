import { pool } from '../../db.js'

export async function createMessage(chatId, text) {
  const res = await pool.query(
    'INSERT INTO message (chat_id, text) VALUES ($1, $2) RETURNING id, chat_id, text, created_at',
    [chatId, text]
  )
  return res.rows[0]
}

export async function listMessagesByChat(chatId) {
  const res = await pool.query(
    'SELECT id, chat_id, text, created_at FROM message WHERE chat_id = $1 ORDER BY created_at ASC, id ASC',
    [chatId]
  )
  return res.rows
}

export async function deleteMessage(id) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM image WHERE message_id = $1', [id])
    const res = await client.query('DELETE FROM message WHERE id = $1 RETURNING id', [id])
    await client.query('COMMIT')
    return res.rows[0]
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}


