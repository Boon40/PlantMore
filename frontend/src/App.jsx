import React, { useEffect, useRef, useState } from 'react'

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const API_BASE = 'http://localhost:3001/api'
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [editingChatId, setEditingChatId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  async function loadChats() {
    const res = await fetch(`${API_BASE}/chat`)
    if (!res.ok) return
    const data = await res.json()
    // Ensure favourites first also on client
    const sorted = [...data].sort((a, b) => Number(b.is_favourite) - Number(a.is_favourite) || b.id - a.id)
    setChats(sorted)
    if (data.length && !activeChatId) setActiveChatId(data[0].id)
  }

  useEffect(() => { loadChats() }, [])

  async function loadMessages(chatId) {
    if (!chatId) { setMessages([]); return }
    try {
      const res = await fetch(`${API_BASE}/message?chat_id=${chatId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.map(r => ({ id: r.id, role: 'user', content: r.text, created_at: r.created_at })))
      }
    } catch {}
  }

  useEffect(() => { loadMessages(activeChatId) }, [activeChatId])

  async function createChatApi() {
    const res = await fetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New chat' }) })
    if (res.ok) {
      const chat = await res.json()
      await loadChats()
      setActiveChatId(chat.id)
    }
  }

  async function toggleFavouriteApi(chat) {
    const method = chat.is_favourite ? 'DELETE' : 'POST'
    const res = await fetch(`${API_BASE}/chat/${chat.id}/favorite`, { method })
    if (res.ok) loadChats()
  }

  async function deleteChatApi(chatId) {
    const res = await fetch(`${API_BASE}/chat/${chatId}`, { method: 'DELETE' })
    if (res.ok) {
      await loadChats()
      if (activeChatId === chatId) setActiveChatId(prev => {
        const remaining = chats.filter(c => c.id !== chatId)
        return remaining[0]?.id ?? null
      })
    }
  }

  function confirmDelete(chat) {
    const ok = window.confirm(`Delete chat "${chat.title}"? This will also remove all its messages and images.`)
    if (!ok) return
    deleteChatApi(chat.id)
  }

  async function renameChatApi(chat) {
    setEditingChatId(chat.id)
    setEditingTitle(chat.title)
  }

  async function commitRename(chatId, title) {
    const trimmed = (title || '').trim()
    setEditingChatId(null)
    if (!trimmed) return
    const res = await fetch(`${API_BASE}/chat/${chatId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: trimmed }) })
    if (res.ok) loadChats()
  }
  const [attachOpen, setAttachOpen] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const cameraInputRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const messagesRef = useRef(null)
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])
  const [attachError, setAttachError] = useState('')
  const MAX_ATTACH = 10
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  function openLightbox(images, index) {
    setLightboxImages(images)
    setLightboxIndex(index)
    setLightboxOpen(true)
  }
  function closeLightbox() { setLightboxOpen(false) }
  function prevLightbox() { setLightboxIndex(i => Math.max(0, i - 1)) }
  function nextLightbox() { setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1)) }

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  async function openCamera() {
    try {
      const constraints = { video: { facingMode: 'environment' }, audio: false }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOpen(true)
    } catch (err) {
      // Fallback to file input if camera not available/denied
      cameraInputRef.current?.click()
    }
  }

  function closeCamera() {
    setCameraOpen(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    // queue the captured image if under limit
    setAttachments(prev => {
      if (prev.length >= MAX_ATTACH) {
        setAttachError(`You can attach up to ${MAX_ATTACH} images.`)
        return prev
      }
      setAttachError('')
      return [...prev, { id: Date.now() + Math.random(), url: dataUrl, kind: 'dataurl' }]
    })
    closeCamera()
  }

  function addFilesFromInput(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setAttachments(prev => {
      const remaining = MAX_ATTACH - prev.length
      if (remaining <= 0) {
        setAttachError(`You can attach up to ${MAX_ATTACH} images.`)
        return prev
      }
      const allowed = files.slice(0, remaining)
      const newItems = allowed.map(f => ({ id: Date.now() + Math.random(), url: URL.createObjectURL(f), kind: 'blob' }))
      if (files.length > remaining) {
        setAttachError(`Only ${remaining} more image${remaining === 1 ? '' : 's'} allowed (max ${MAX_ATTACH}).`)
      } else {
        setAttachError('')
      }
      return [...prev, ...newItems]
    })
  }

  function onRemoveAttachment(id) {
    setAttachments(prev => {
      const item = prev.find(a => a.id === id)
      if (item && item.kind === 'blob') {
        URL.revokeObjectURL(item.url)
      }
      return prev.filter(a => a.id !== id)
    })
    setAttachError('')
  }

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return
    if (!activeChatId) return
    const res = await fetch(`${API_BASE}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: activeChatId, text: trimmed }) })
    if (res.ok) {
      const saved = await res.json()
      setMessages(prev => [...prev, { id: saved.id, role: 'user', content: saved.text, created_at: saved.created_at }])
      setInput('')
      setAttachments([])
      setAttachError('')
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>
          <span className="leaf">🌿</span>
          PlantMoreAI
        </h1>
        <p className="sub">Your friendly guide to thriving houseplants</p>
      </header>
      <main className="layout">
        <aside className="sidebar" aria-label="Conversations">
          <div className="sidebar-header">
            <span>Chats</span>
            <button className="iconSquare plus" type="button" aria-label="Start new chat" title="Start new chat" onClick={createChatApi}>
              {/* Plus icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <ul className="chat-list">
            {chats.map(chat => (
              <li
                key={chat.id}
                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                {editingChatId === chat.id ? (
                  <input
                    className="chat-edit"
                    value={editingTitle}
                    autoFocus
                    onFocus={e => e.target.select()}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(chat.id, editingTitle)
                      if (e.key === 'Escape') setEditingChatId(null)
                    }}
                    onBlur={() => commitRename(chat.id, editingTitle)}
                  />
                ) : (
                  <span className="chat-title">
                    {chat.title}
                    {chat.is_favourite && <span className="favMark" title="Favourite">⭐</span>}
                  </span>
                )}
                <div className="chat-actions" onClick={e => e.stopPropagation()}>
                  <button className="iconSquare edit" title="Edit chat name" aria-label="Edit chat name" type="button" onClick={() => renameChatApi(chat)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
                      <path d="M14.06 4.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button className={`iconSquare star ${chat.is_favourite ? 'on' : ''}`} title="Set chat as favourite" aria-label="Set chat as favourite" type="button" onClick={() => toggleFavouriteApi(chat)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" stroke="currentColor" fill={chat.is_favourite ? 'currentColor' : 'none'} strokeWidth="1.5"/>
                    </svg>
                  </button>
                  <button className="iconSquare trash" title="Delete chat" aria-label="Delete chat" type="button" onClick={() => confirmDelete(chat)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chatPanel" aria-label="Chat">
          <div className="messages" ref={messagesRef}>
            {messages.map(m => {
              const count = m.attachments?.length || 0
              const firstFour = count > 4 ? m.attachments.slice(0, 4) : m.attachments
              const extra = count > 4 ? count - 4 : 0
              return (
                <div key={m.id} className={`message ${m.role}`}>
                  {count > 0 && (
                    <div className={`msgAttachments c${Math.min(count,4)}`}>
                      {firstFour.map((att, idx) => (
                        <div key={att.id} className="tile">
                          <img
                            src={att.url}
                            alt="Attachment"
                            onClick={() => openLightbox(m.attachments, idx)}
                            role="button"
                          />
                          {extra > 0 && idx === firstFour.length - 1 && (
                            <div className="moreOverlay">+{extra}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.content && <div className="bubble">{m.content}</div>}
                </div>
              )
            })}
          </div>
          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map(att => (
                <div key={att.id} className="attachment">
                  <img src={att.url} alt="Selected" />
                  <button className="remove" type="button" aria-label="Remove" title="Remove" onClick={() => onRemoveAttachment(att.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
          {attachError && (
            <div className="attachError" role="status" aria-live="polite">{attachError}</div>
          )}
          <form className="composer" onSubmit={handleSend}>
            {(() => { const hasContent = Boolean(input.trim()) || attachments.length > 0; return (
              <div className={`inputWrap ${hasContent ? 'hasContent' : ''}`}>
                <button
                  className="attachInside"
                  type="button"
                  aria-label="Attach image"
                  title="Attach image"
                  onClick={() => setAttachOpen(v => !v)}
                >
                  +
                </button>
                {attachOpen && (
                  <div className="attachMenu" role="menu" aria-label="Attach options">
                    <button
                      className="item"
                      type="button"
                      onClick={() => {
                        setAttachOpen(false)
                        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                          openCamera()
                        } else {
                          cameraInputRef.current?.click()
                        }
                      }}
                    >
                      <span className="itemIcon">📷</span>
                      Camera
                    </button>
                    <button
                      className="item"
                      type="button"
                      onClick={() => {
                        setAttachOpen(false)
                        setDeviceOpen(true)
                      }}
                    >
                      <span className="itemIcon">💾</span>
                      Device
                    </button>
                  </div>
                )}
                {/* hidden input fallback */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => { addFilesFromInput(e.target.files); e.target.value = '' }}
                />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your message..."
                  aria-label="Message"
                />
                <button className="sendInside" type="submit" aria-label="Send">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 19V5M12 5l-5 5M12 5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )})()}
          </form>
          {deviceOpen && (
            <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Select images" onClick={(e) => { if (e.target === e.currentTarget) setDeviceOpen(false) }}>
              <div className="deviceModal">
                <div className="modalHeader">
                  <h2>Select images</h2>
                  <button className="closeBtn" type="button" aria-label="Close" onClick={() => setDeviceOpen(false)}>✕</button>
                </div>
                <div className="dropZone"
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => { e.preventDefault(); addFilesFromInput(e.dataTransfer.files); setDeviceOpen(false) }}
                >
                  Drag & drop images here, or click to browse
                  <input type="file" accept="image/*" multiple onChange={(e) => { addFilesFromInput(e.target.files); setDeviceOpen(false); e.target.value=''}} />
                </div>
              </div>
            </div>
          )}

          {cameraOpen && (
            <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Camera" onClick={(e) => { if (e.target === e.currentTarget) closeCamera() }}>
              <div className="cameraModal">
                <div className="modalHeader">
                  <h2>Take a photo</h2>
                  <button className="closeBtn" type="button" aria-label="Close" onClick={closeCamera}>✕</button>
                </div>
                <div className="cameraBody">
                  <video ref={videoRef} playsInline muted />
                </div>
                <div className="cameraActions">
                  <button className="captureBtn" type="button" onClick={capturePhoto}>Capture</button>
                </div>
              </div>
            </div>
          )}

          {lightboxOpen && lightboxImages.length > 0 && (
            <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Image preview" onClick={(e)=>{ if (e.target === e.currentTarget) closeLightbox() }}>
              <div className="lightbox">
                <button className="closeBtn" type="button" aria-label="Close" onClick={closeLightbox}>✕</button>
                {lightboxIndex > 0 && (
                  <button className="navBtn left" type="button" aria-label="Previous image" onClick={prevLightbox}>❮</button>
                )}
                <img src={lightboxImages[lightboxIndex]?.url} alt="Preview" />
                {lightboxIndex < lightboxImages.length - 1 && (
                  <button className="navBtn right" type="button" aria-label="Next image" onClick={nextLightbox}>❯</button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}


