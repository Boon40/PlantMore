import React, { useEffect, useRef, useState } from 'react'

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const API_BASE = 'http://localhost:3001/api'
  const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '')
  const absUrl = (u) => (u && u.startsWith('/') ? `${API_ORIGIN}${u}` : u)
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
        setMessages(data.map(r => {
          // Determine role: messages with images are from user
          // Assistant messages are those without images that start with classification indicators
          const hasImages = r.images && r.images.length > 0
          const text = r.text || ''
          const isAssistant = !hasImages && (text.startsWith('🌿') || text.startsWith('🔍') || text.includes('identified this plant'))
          const role = isAssistant ? 'assistant' : 'user'
          return {
            id: r.id,
            role: role,
            content: text,
            created_at: r.created_at,
            attachments: (r.images || []).map(img => ({ id: img.id, url: absUrl(img.image_url) }))
          }
        }))
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
  const [autoClassify, setAutoClassify] = useState(true) // Enable auto-classification by default
  const [classifyingImages, setClassifyingImages] = useState(new Set()) // Track images being classified
  const [imageClassifications, setImageClassifications] = useState({}) // Store classifications by image ID
  const [classifyingMessageIds, setClassifyingMessageIds] = useState(new Set()) // Track messages with images being classified

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

  async function classifyImage(imageId) {
    if (classifyingImages.has(imageId)) return // Already classifying
    
    setClassifyingImages(prev => new Set(prev).add(imageId))
    try {
      const res = await fetch(`${API_BASE}/image/${imageId}/classify`, { method: 'POST' })
      if (res.ok) {
        const classification = await res.json()
        if (classification.success) {
          setImageClassifications(prev => ({
            ...prev,
            [imageId]: classification
          }))
        }
      }
    } catch (err) {
      console.error('Classification failed:', err)
    } finally {
      setClassifyingImages(prev => {
        const next = new Set(prev)
        next.delete(imageId)
        return next
      })
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return
    if (!activeChatId) return
    
    // Store attachments locally before clearing
    const attachmentsToUpload = [...attachments]
    
    const res = await fetch(`${API_BASE}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: activeChatId, text: trimmed }) })
    if (res.ok) {
      const saved = await res.json()
      let newMsg = { id: saved.id, role: 'user', content: saved.text || '', created_at: saved.created_at, attachments: [] }
      
      // Add message to UI immediately (before uploads complete)
      setMessages(prev => [...prev, newMsg])
      setInput('')
      setAttachments([])
      setAttachError('')
      
      // Upload attachments in background and update message
      if (attachmentsToUpload.length > 0) {
        // Create a temporary "thinking" assistant message immediately if auto-classifying
        const thinkingMsgId = autoClassify ? `thinking-${saved.id}-${Date.now()}` : null
        if (autoClassify && thinkingMsgId) {
          const thinkingMsg = {
            id: thinkingMsgId,
            role: 'assistant',
            content: '⏳ Analyzing plant images...',
            created_at: new Date().toISOString(),
            attachments: [],
            isThinking: true
          }
          setMessages(prev => [...prev, thinkingMsg])
        }
        
        (async () => {
          console.log('[Frontend] Starting upload of', attachmentsToUpload.length, 'images')
          const uploadedAttachments = []
          for (const att of attachmentsToUpload) {
            try {
              console.log('[Frontend] Uploading image:', att.id)
              const blob = att.kind === 'dataurl' ? await (await fetch(att.url)).blob() : await (await fetch(att.url)).blob()
              const fd = new FormData()
              fd.append('message_id', String(saved.id))
              fd.append('file', new File([blob], 'upload.jpg', { type: blob.type || 'image/jpeg' }))
              if (autoClassify) {
                fd.append('auto_classify', 'true')
              }
              console.log('[Frontend] Sending upload request to:', `${API_BASE}/image/upload`)
              const up = await fetch(`${API_BASE}/image/upload`, { method: 'POST', body: fd })
              if (up.ok) {
                const img = await up.json()
                console.log('[Frontend] Upload successful:', img)
                uploadedAttachments.push({ id: img.id, url: absUrl(img.image_url) })
                
                // Update the message with the new attachment (merge with existing)
                setMessages(prev => {
                  const updated = prev.map(m => 
                    m.id === saved.id 
                      ? { ...m, attachments: [...(m.attachments || []), { id: img.id, url: absUrl(img.image_url) }] }
                      : m
                  )
                  console.log('[Frontend] Updated messages with attachment:', updated.find(m => m.id === saved.id))
                  return updated
                })
                
                // Store classification if available (though it won't be, since it's async now)
                if (img.classification && img.classification.success) {
                  setImageClassifications(prev => ({
                    ...prev,
                    [img.id]: img.classification
                  }))
                }
              } else {
                const errorText = await up.text().catch(() => 'Unknown error')
                console.error('[Frontend] Upload failed:', up.status, errorText)
              }
            } catch (err) {
              console.error('[Frontend] Upload error:', err)
            }
          }
          console.log('[Frontend] Finished uploading. Total uploaded:', uploadedAttachments.length)
          
          // Poll for assistant responses (classification results) after uploads complete
          if (uploadedAttachments.length > 0 && autoClassify && thinkingMsgId) {
            console.log('[Frontend] Starting to poll for assistant response...')
            // Wait a bit for classification to start
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Poll for new messages (assistant response)
            // Merge with existing messages instead of replacing
            let attempts = 0
            const maxAttempts = 25
            const pollInterval = setInterval(async () => {
              attempts++
              console.log(`[Frontend] Polling attempt ${attempts}/${maxAttempts}`)
              try {
                const res = await fetch(`${API_BASE}/message?chat_id=${activeChatId}`)
                if (res.ok) {
                  const data = await res.json()
                  console.log(`[Frontend] Received ${data.length} messages from server`)
                  // Merge server messages with local state, preserving local attachments
                  setMessages(prev => {
                    const serverMessages = data.map(r => {
                      const hasImages = r.images && r.images.length > 0
                      const text = r.text || ''
                      const isAssistant = !hasImages && (text.startsWith('🌿') || text.startsWith('🔍') || text.includes('identified this plant'))
                      const role = isAssistant ? 'assistant' : 'user'
                      return {
                        id: r.id,
                        role: role,
                        content: text,
                        created_at: r.created_at,
                        attachments: (r.images || []).map(img => ({ id: img.id, url: absUrl(img.image_url) }))
                      }
                    })
                    
                    // Merge: use server data but preserve local message attachments and thinking messages
                    const merged = serverMessages.map(serverMsg => {
                      const localMsg = prev.find(m => m.id === serverMsg.id)
                      if (localMsg) {
                        // Merge attachments: use server attachments (they're authoritative) but keep any local-only ones
                        const serverAttachments = serverMsg.attachments || []
                        const localAttachments = localMsg.attachments || []
                        // Combine and deduplicate by id
                        const allAttachments = [...serverAttachments, ...localAttachments]
                        const uniqueAttachments = Array.from(
                          new Map(allAttachments.map(att => [att.id, att])).values()
                        )
                        return { ...serverMsg, attachments: uniqueAttachments }
                      }
                      return serverMsg
                    })
                    
                    // Add any local messages not in server (thinking messages, etc.)
                    const localOnly = prev.filter(local => {
                      // Keep thinking messages and messages not yet on server
                      return local.isThinking || !serverMessages.find(s => s.id === local.id)
                    })
                    
                    const combined = [...merged, ...localOnly]
                    // Sort by created_at, then by id
                    return combined.sort((a, b) => {
                      const aTime = new Date(a.created_at || 0).getTime()
                      const bTime = new Date(b.created_at || 0).getTime()
                      if (aTime !== bTime) {
                        return aTime - bTime
                      }
                      // For same timestamp, put thinking messages after
                      if (a.isThinking && !b.isThinking) return 1
                      if (!a.isThinking && b.isThinking) return -1
                      return (a.id || 0) - (b.id || 0)
                    })
                  })
                  
                  // Check if we got an assistant message
                  const assistantMsg = data.find(r => {
                    const hasImages = r.images && r.images.length > 0
                    const text = r.text || ''
                    return !hasImages && (text.startsWith('🌿') || text.startsWith('🔍') || text.includes('identified this plant'))
                  })
                  
                  if (assistantMsg || attempts >= maxAttempts) {
                    clearInterval(pollInterval)
                    // Remove thinking message and replace with actual response
                    setMessages(prev => {
                    // Remove thinking message
                    const withoutThinking = prev.filter(m => !m.isThinking || m.id !== thinkingMsgId)
                      // If we got an assistant message, add it
                      if (assistantMsg) {
                        const hasImages = assistantMsg.images && assistantMsg.images.length > 0
                        const text = assistantMsg.text || ''
                        const isAssistant = !hasImages && (text.startsWith('🌿') || text.startsWith('🔍') || text.includes('identified this plant'))
                        if (isAssistant) {
                          const newAssistantMsg = {
                            id: assistantMsg.id,
                            role: 'assistant',
                            content: text,
                            created_at: assistantMsg.created_at,
                            attachments: []
                          }
                          return [...withoutThinking, newAssistantMsg]
                        }
                      }
                      return withoutThinking
                    })
                  }
                }
              } catch (err) {
                console.error('Poll error:', err)
              }
              
              if (attempts >= maxAttempts) {
                clearInterval(pollInterval)
              }
            }, 2000) // Check every 2 seconds
            
            // Stop polling after 50 seconds max
            setTimeout(() => clearInterval(pollInterval), 50000)
          }
        })()
      }
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
                      {firstFour.map((att, idx) => {
                        const classification = imageClassifications[att.id]
                        const isClassifying = classifyingImages.has(att.id)
                        return (
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
                            {classification && classification.success && (
                              <div className="classification-badge" title={`${classification.prediction} (${(classification.confidence * 100).toFixed(0)}%)`}>
                                🌿 {classification.prediction}
                              </div>
                            )}
                            {!classification && !isClassifying && (
                              <button
                                className="classify-btn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  classifyImage(att.id)
                                }}
                                title="Identify plant"
                              >
                                🔍
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {m.content && (
                    <div className="bubble">
                      {m.role === 'assistant' ? (
                        m.isThinking ? (
                          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)', fontStyle: 'italic' }}>
                            <span className="spinner">⏳</span> {m.content.replace('⏳ ', '')}
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {typeof m.content === 'string' ? m.content.split('**').map((part, i) => 
                              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                            ) : m.content}
                          </div>
                        )
                      ) : (
                        m.content
                      )}
                    </div>
                  )}
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


