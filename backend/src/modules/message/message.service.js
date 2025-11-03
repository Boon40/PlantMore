import { pool } from '../../db.js'

export async function createMessage(chatId, text) {
  const res = await pool.query(
    'INSERT INTO message (chat_id, text) VALUES ($1, $2) RETURNING id, chat_id, text, created_at',
    [chatId, text && text.length ? text : null]
  )
  return res.rows[0]
}

export async function listMessagesByChat(chatId) {
  const res = await pool.query(
    `SELECT m.id, m.chat_id, m.text, m.created_at,
            COALESCE(json_agg(json_build_object('id', i.id, 'image_url', i.image_url) ORDER BY i.id)
                     FILTER (WHERE i.id IS NOT NULL), '[]') AS images
     FROM message m
     LEFT JOIN image i ON i.message_id = m.id
     WHERE m.chat_id = $1
     GROUP BY m.id
     ORDER BY m.created_at ASC, m.id ASC`,
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


