import { pool } from '../../db.js'

export async function createImage(messageId, imageUrl) {
  const res = await pool.query(
    'INSERT INTO image (message_id, image_url) VALUES ($1, $2) RETURNING id, message_id, image_url',
    [messageId, imageUrl]
  )
  return res.rows[0]
}

export async function listImagesByMessage(messageId) {
  const res = await pool.query(
    'SELECT id, message_id, image_url FROM image WHERE message_id = $1 ORDER BY id ASC',
    [messageId]
  )
  return res.rows
}

export async function deleteImage(id) {
  const res = await pool.query('DELETE FROM image WHERE id = $1 RETURNING id', [id])
  return res.rows[0]
}

export async function getImageById(id) {
  const res = await pool.query(
    'SELECT id, message_id, image_url FROM image WHERE id = $1',
    [id]
  )
  return res.rows[0] || null
}


