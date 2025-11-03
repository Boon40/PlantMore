-- Create schema for PlantMore
CREATE TABLE IF NOT EXISTS chat (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  is_favourite BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS message (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_chat_id ON message(chat_id);

CREATE TABLE IF NOT EXISTS image (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_image_message_id ON image(message_id);


