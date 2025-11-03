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
  const res = await pool.query('DELETE FROM chat WHERE id = $1 RETURNING id', [id])
  return res.rows[0]
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


