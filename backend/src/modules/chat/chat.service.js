import { pool } from '../../db.js'

export async function createChat(title) {
  const res = await pool.query(
    'INSERT INTO chat (title) VALUES ($1) RETURNING id, title, is_favourite',
    [title]
  )
  return res.rows[0]
}

export async function updateChatTitle(id, title) {
  const res = await pool.query(
    'UPDATE chat SET title = $2 WHERE id = $1 RETURNING id, title, is_favourite',
    [id, title]
  )
  return res.rows[0]
}

export async function deleteChat(id) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // delete images for messages in this chat, then messages, then chat
    await client.query('DELETE FROM image WHERE message_id IN (SELECT id FROM message WHERE chat_id = $1)', [id])
    await client.query('DELETE FROM message WHERE chat_id = $1', [id])
    const res = await client.query('DELETE FROM chat WHERE id = $1 RETURNING id', [id])
    await client.query('COMMIT')
    return res.rows[0]
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function setFavourite(id, fav) {
  const res = await pool.query(
    'UPDATE chat SET is_favourite = $2 WHERE id = $1 RETURNING id, title, is_favourite',
    [id, fav]
  )
  return res.rows[0]
}

export async function getChat(id) {
  const res = await pool.query('SELECT id, title, is_favourite FROM chat WHERE id = $1', [id])
  return res.rows[0]
}

export async function listChats() {
  const res = await pool.query('SELECT id, title, is_favourite FROM chat ORDER BY is_favourite DESC, id DESC')
  return res.rows
}


