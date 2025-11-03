import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER || 'plantmore'}:${process.env.POSTGRES_PASSWORD || 'plantmore'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'plantmore'}`

export const pool = new Pool({ connectionString })

export async function dbHealth() {
  const res = await pool.query('SELECT 1 as ok')
  return res.rows[0]?.ok === 1
}

export async function ensureSchema() {
  // Make message.text nullable (if created earlier as NOT NULL)
  try {
    await pool.query('ALTER TABLE message ALTER COLUMN text DROP NOT NULL')
  } catch (e) {
    // ignore if already nullable or table missing
  }
}


