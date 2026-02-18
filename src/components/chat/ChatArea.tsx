// ═══════════════════════════════════════
// AIdark — Chat Area v6 (+ ATTACHMENTS)
// ═══════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Send, Maximize2, Minimize2, Square, Plus, X, Image, FileText } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessageStream, sendMessage } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { APP_CONFIG, AI_CHARACTERS } from '@/lib/constants';
import { MessageBubble } from './MessageBubble';
import { ModelSelector } from './ModelSelector';
import { CharacterSelector } from './CharacterSelector';
import { TypingParticles } from './TypingParticles';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';
import type { Message, Attachment } from '@/types';

// Límites de archivos
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPES = ['application/pdf'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];

interface ChatAreaProps {
  onOpenPricing: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenPricing }) => {
  const {
    sessions, activeSessionId, selectedModel, selectedCharacter, isTyping,
    setIsTyping, addMessage, createSession, writerMode, setWriterMode,
  } = useChatStore();
  const { canSendMessage, incrementMessages, getRemainingMessages, user } = useAuthStore();
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const charLimit = APP_CONFIG.freeCharLimit;
  const remaining = getRemainingMessages();
  const character = AI_CHARACTERS.find((c) => c.id === selectedCharacter) || AI_CHARACTERS[0];

  // ── ¿Puede adjuntar archivos? (Pro/Ultra o developer) ──
  const userPlan = user?.plan || 'free';
  const canAttach = ['pro_quarterly', 'ultra_annual'].includes(userPlan);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, streamingContent]);

  useEffect(() => { textareaRef.current?.focus(); }, [activeSessionId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (streamingContent) setKeystrokeCount((k) => k + 1);
  }, [streamingContent]);

  // Close attach menu on outside click
  useEffect(() => {
    if (!showAttachMenu) return;
    const handle = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAttachMenu]);

  const stopGeneration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsTyping(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // FILE HANDLING
  // ══════════════════════════════════════════════════════════
  const handleFileSelect = (accept: string) => {
    if (!canAttach) {
      onOpenPricing();
      return;
    }
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('Archivo muy grande. Máximo 5MB.');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Formato no soportado. Usa JPG, PNG, WEBP o PDF.');
      return;
    }

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      // Imagen → base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachment({
          type: 'image',
          data: base64,
          name: file.name,
          mimeType: file.type,
          preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // PDF → extraer texto básico
      const reader = new FileReader();
      reader.onload = () => {
        const text = extractPdfText(reader.result as ArrayBuffer);
        setAttachment({
          type: 'pdf',
          data: text || `[PDF: ${file.name} — No se pudo extraer texto. El archivo puede ser escaneado.]`,
          name: file.name,
          mimeType: file.type,
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Extracción básica de texto de PDF (sin librería externa)
  const extractPdfText = (buffer: ArrayBuffer): string => {
    try {
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('latin1').decode(bytes);
      const textMatches: string[] = [];

      // Buscar bloques de texto entre BT y ET
      const btRegex = /BT\s([\s\S]*?)ET/g;
      let match;
      while ((match = btRegex.exec(text)) !== null) {
        const block = match[1];
        // Extraer strings entre paréntesis
        const strRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = strRegex.exec(block)) !== null) {
          const str = strMatch[1].replace(/\\n/g, '\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
          if (str.trim()) textMatches.push(str.trim());
        }
      }

      if (textMatches.length > 0) {
        return textMatches.join(' ').slice(0, 8000); // Máximo 8k chars
      }

      // Fallback: buscar texto plano
      const plainText = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
      const readable = plainText.match(/[a-zA-Z]{3,}/g);
      if (readable && readable.length > 20) {
        return readable.join(' ').slice(0, 8000);
      }

      return '';
    } catch {
      return '';
    }
  };

  const removeAttachment = () => setAttachment(null);

  // ══════════════════════════════════════════════════════════
  // SEND MESSAGE
  // ══════════════════════════════════════════════════════════
  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isTyping) return;

    if (!canSendMessage()) {
      onOpenPricing();
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim() || (attachment ? `[${attachment.name}]` : ''),
      timestamp: Date.now(),
      model: selectedModel,
      character: selectedCharacter,
      ...(attachment ? { attachment } : {}),
    };

    addMessage(sessionId, userMsg);
    setInput('');
    setAttachment(null);
    setIsTyping(true);
    setStreamingContent('');
    incrementMessages();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullResponse = '';
      await sendMessageStream(
        [...messages, userMsg],
        selectedModel,
        selectedCharacter,
        (chunk) => {
          fullResponse += chunk;
          setStreamingContent(fullResponse);
        },
        () => {
         const errorMsg = (error as any)?.message?.includes('límite')
          ? 'Has alcanzado el límite de mensajes. Actualiza tu plan para continuar.'
          : t('chat.error');
        addMessage(sessionId!, {
            id: generateId(), role: 'assistant', content: errorMsg,
            timestamp: Date.now(),
          });
          setStreamingContent('');
          setIsTyping(false);
        },
        controller.signal
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User stopped
      } else {
        try {
          const response = await sendMessage([...messages, userMsg], selectedModel, selectedCharacter);
          addMessage(sessionId!, {
            id: generateId(), role: 'assistant', content: response,
            timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
          });
        } catch {
          addMessage(sessionId!, {
            id: generateId(), role: 'assistant', content: t('chat.error'),
            timestamp: Date.now(),
          });
        }
      }
      setStreamingContent('');
      setIsTyping(false);
    } finally {
      abortRef.current = null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= charLimit) {
      setInput(val);
      setKeystrokeCount((k) => k + 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <TypingParticles trigger={keystrokeCount} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = ''; // reset
        }}
      />

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        padding: writerMode ? '0' : undefined, position: 'relative', zIndex: 2,
      }}>
        {messages.length === 0 && !streamingContent ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            <div style={{ marginBottom: 6, animation: 'fadeIn 0.8s ease' }}>
              <span style={{
                fontSize: isMobile ? 36 : 44, fontWeight: 500,
                color: 'var(--txt-ghost)', userSelect: 'none',
              }}>
                AI<span style={{ opacity: 0.6 }}>dark</span>
              </span>
            </div>
            <span style={{
              fontSize: isMobile ? 9 : 10, color: 'var(--txt-mut)',
              letterSpacing: 4, textTransform: 'uppercase',
              animation: 'fadeIn 1.2s ease',
            }}>
              {t('app.tagline')}
            </span>
            <p style={{
              fontSize: 13, color: 'var(--txt-mut)', marginTop: 14,
              textAlign: 'center', maxWidth: 300, lineHeight: 1.7,
              animation: 'fadeIn 1.6s ease',
            }}>
              {t('app.privacy')}
            </p>
          </div>
        ) : (
          <div style={{
            maxWidth: writerMode ? 900 : 720, width: '100%', margin: '0 auto',
            padding: isMobile ? '16px 14px' : '24px 20px', flex: 1,
          }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} index={idx} />
            ))}
            {isTyping && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming', role: 'assistant', content: streamingContent,
                  timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
                }}
                index={messages.length}
              />
            )}
            {isTyping && !streamingContent && (
              <div style={{ paddingLeft: isMobile ? 0 : 32, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: character.color,
                        animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--txt-ter)', fontWeight: 500 }}>
                    {character.name} {t('chat.typing')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input Area ── */}
      <div style={{
        padding: messages.length === 0
          ? (isMobile ? '0 12px 24px' : '0 20px 40px')
          : (isMobile ? '0 12px 14px' : '0 20px 20px'),
        display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%' }}>

          {/* Attachment Preview */}
          {attachment && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', marginBottom: 6,
              background: 'var(--bg-el)', borderRadius: 10,
              border: '1px solid var(--border-sub)',
            }}>
              {attachment.type === 'image' && attachment.preview ? (
                <img src={attachment.preview} alt={attachment.name}
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: 6,
                  background: 'rgba(160,81,59,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={18} style={{ color: 'var(--danger)' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--txt-pri)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {attachment.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt-mut)' }}>
                  {attachment.type === 'image' ? 'Imagen' : 'PDF'}
                </div>
              </div>
              <button onClick={removeAttachment} style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'none', border: 'none',
                color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 4,
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-mut)'}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-sub)',
            borderRadius: isMobile ? 12 : 14,
            padding: isMobile ? '10px 12px 8px' : '12px 16px 8px',
            transition: 'border-color 0.2s',
          }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`${t('chat.write_to')} ${character.name}...`}
              rows={1}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                resize: 'none', fontFamily: 'inherit', fontSize: 14,
                color: 'var(--txt-pri)', lineHeight: 1.6,
                minHeight: 24, maxHeight: 160,
                overflowY: 'auto', overflowX: 'hidden',
                wordWrap: 'break-word', whiteSpace: 'pre-wrap',
              }}
            />

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 8, gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* ── BOTÓN + (adjuntar) ── */}
                <div style={{ position: 'relative' }} ref={attachMenuRef}>
                  <button
                    onClick={() => {
                      if (!canAttach) { onOpenPricing(); return; }
                      setShowAttachMenu(!showAttachMenu);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 30, height: 30, borderRadius: 8,
                      background: showAttachMenu ? 'var(--bg-hover)' : 'transparent',
                      border: '1px solid var(--border-sub)',
                      color: canAttach ? 'var(--txt-sec)' : 'var(--txt-ghost)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (canAttach) e.currentTarget.style.borderColor = 'var(--border-str)'; }}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
                  >
                    <Plus size={15} />
                  </button>

                  {/* Dropdown menu */}
                  {showAttachMenu && (
                    <div style={{
                      position: 'absolute', bottom: 36, left: 0, zIndex: 50,
                      background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
                      borderRadius: 10, padding: 4, minWidth: 160,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}>
                      <button
                        onClick={() => handleFileSelect(ALLOWED_IMAGE_TYPES.join(','))}
                        style={{
                          width: '100%', padding: '9px 12px', display: 'flex',
                          alignItems: 'center', gap: 8, background: 'none',
                          border: 'none', borderRadius: 6, color: 'var(--txt-sec)',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <Image size={14} style={{ color: '#6b8f71' }} /> Foto o imagen
                      </button>
                      <button
                        onClick={() => handleFileSelect(ALLOWED_PDF_TYPES.join(','))}
                        style={{
                          width: '100%', padding: '9px 12px', display: 'flex',
                          alignItems: 'center', gap: 8, background: 'none',
                          border: 'none', borderRadius: 6, color: 'var(--txt-sec)',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <FileText size={14} style={{ color: '#c9944a' }} /> Archivo PDF
                      </button>
                    </div>
                  )}
                </div>

                <ModelSelector />
                <CharacterSelector />
                {!isMobile && messages.length > 0 && (
                  <button onClick={() => setWriterMode(!writerMode)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', border: `1px solid ${writerMode ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    borderRadius: 16, background: writerMode ? 'var(--bg-hover)' : 'transparent',
                    color: writerMode ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                    {writerMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                    {writerMode ? t('chat.normal') : t('chat.writer')}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10,
                  color: input.length > charLimit * 0.9 ? 'var(--danger)' : 'var(--txt-mut)',
                }}>
                  {input.length}/{charLimit}
                </span>
                {isTyping ? (
                  <button onClick={stopGeneration} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, background: 'var(--danger)',
                    border: 'none', borderRadius: '50%', cursor: 'pointer',
                  }}>
                    <Square size={12} fill="#fff" color="#fff" />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={(!input.trim() && !attachment) || isTyping} style={{
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: (input.trim() || attachment) ? 'var(--border-str)' : 'var(--bg-el)',
                    border: 'none', borderRadius: 8,
                    color: (input.trim() || attachment) ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    cursor: (input.trim() || attachment) ? 'pointer' : 'default', transition: 'all 0.2s',
                    animation: (input.trim() || attachment) ? 'glow 2s ease-in-out infinite' : 'none',
                  }}>
                    <Send size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 6, padding: '0 4px',
          }}>
            <span style={{ fontSize: 10, color: 'var(--txt-ghost)' }}>
              {t('app.chats_private')}
            </span>
            <span style={{ fontSize: 10, color: remaining <= 2 ? 'var(--danger)' : 'var(--txt-ghost)' }}>
              {remaining >= 999 ? t('app.unlimited') : remaining} {t('app.msgs_remaining')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
