import React, { useState } from 'react'

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hi! Ask me anything about plants 🌱' }
  ])
  const [input, setInput] = useState('')

  function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const userMsg = { id: Date.now(), role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    // Placeholder echo until backend is wired
    const reply = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `You said: "${trimmed}" (model coming soon)`
    }
    setTimeout(() => setMessages(prev => [...prev, reply]), 400)
  }

  return (
    <div className="page">
      <header className="header">
        <h1>
          <span className="leaf">🌿</span>
          PlantMore Chat
        </h1>
        <p className="sub">Your friendly guide to thriving houseplants</p>
      </header>
      <main className="layout">
        <aside className="sidebar" aria-label="Conversations">
          <div className="sidebar-header">
            <span>Chats</span>
            <button className="iconSquare plus" type="button" aria-label="Start new chat" title="Start new chat" data-tip="Start new chat">
              {/* Plus icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <ul className="chat-list">
            <li className="chat-item active">
              Getting started
              <div className="chat-actions" aria-hidden="true">
                <button className="iconSquare edit" title="Edit chat name" aria-label="Edit chat name" type="button" data-tip="Edit chat name">
                  {/* Pencil icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                    <path d="M14.06 4.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="iconSquare star" title="Set chat as favourite" aria-label="Set chat as favourite" type="button" data-tip="Set chat as favourite">
                  {/* Star icon (outlined) */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                  </svg>
                </button>
                <button className="iconSquare trash" title="Delete chat" aria-label="Delete chat" type="button" data-tip="Delete chat">
                  {/* Trash icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </li>
            <li className="chat-item">
              Cacti care
              <div className="chat-actions" aria-hidden="true">
                <button className="iconSquare edit" title="Edit chat name" aria-label="Edit chat name" type="button" data-tip="Edit chat name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                    <path d="M14.06 4.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="iconSquare star" title="Set chat as favourite" aria-label="Set chat as favourite" type="button" data-tip="Set chat as favourite">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                  </svg>
                </button>
                <button className="iconSquare trash" title="Delete chat" aria-label="Delete chat" type="button" data-tip="Delete chat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </li>
            <li className="chat-item">
              Bloom boosters
              <div className="chat-actions" aria-hidden="true">
                <button className="iconSquare edit" title="Edit chat name" aria-label="Edit chat name" type="button" data-tip="Edit chat name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                    <path d="M14.06 4.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="iconSquare star" title="Set chat as favourite" aria-label="Set chat as favourite" type="button" data-tip="Set chat as favourite">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                  </svg>
                </button>
                <button className="iconSquare trash" title="Delete chat" aria-label="Delete chat" type="button" data-tip="Delete chat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </li>
          </ul>
        </aside>

        <section className="chatPanel" aria-label="Chat">
          <div className="messages">
            {messages.map(m => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="bubble">{m.content}</div>
              </div>
            ))}
          </div>
          <form className="composer" onSubmit={handleSend}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              aria-label="Message"
            />
            <button type="submit">Send</button>
          </form>
        </section>
      </main>
    </div>
  )
}


