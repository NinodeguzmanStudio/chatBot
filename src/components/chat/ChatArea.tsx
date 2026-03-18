// ═══════════════════════════════════════
// AIdark — Chat Area (FIXED)
// src/components/chat/ChatArea.tsx
// FIX: círculo de progreso de mensajes para usuarios free
//      se muestra junto al botón de enviar
// ═══════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Send, Maximize2, Minimize2, Square, Plus, X, Image, FileText, Sparkles } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessageStream, sendMessage } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { APP_CONFIG, AI_CHARACTERS } from '@/lib/constants';
import { MessageBubble } from './MessageBubble';
import { CharacterSelector } from './CharacterSelector';
import { TypingParticles } from './TypingParticles';
import { ImageGenerator } from './ImageGenerator';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';
import type { Message, Attachment } from '@/types';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB → base64 queda en ~4MB, bajo el límite de Vercel
const ALLOWED_IMAGE_TYPES   = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPES     = ['application/pdf'];
const ALLOWED_TYPES         = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];
const FREE_LIMIT            = APP_CONFIG.freeMessageLimit; // 12

interface ChatAreaProps {
  onOpenPricing: () => void;
}

// ── Círculo de progreso SVG ──
// Muestra cuántos mensajes quedan. Solo para usuarios free.
const MessageProgressCircle: React.FC<{
  remaining: number;
  total: number;
  onClick: () => void;
}> = ({ remaining, total, onClick }) => {
  const size       = 32;
  const stroke     = 2.5;
  const radius     = (size - stroke) / 2;
  const circ       = 2 * Math.PI * radius;
  const used       = total - remaining;
  const progress   = Math.min(used / total, 1);
  const dashOffset = circ * (1 - progress);

  // Color según cuánto queda
  const color =
    remaining <= 2 ? '#e05555' :
    remaining <= 5 ? '#c9944a' :
    '#6b8a5e';

  return (
    <button
      onClick={onClick}
      title={`${remaining} mensajes restantes hoy`}
      style={{
        position: 'relative', width: size, height: size,
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, flexShrink: 0,
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--border-sub)"
          strokeWidth={stroke}
        />
        {/* Progreso */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
        />
      </svg>
      {/* Número en el centro */}
      <span style={{
        position: 'absolute',
        fontSize: remaining >= 10 ? 9 : 10,
        fontWeight: 600,
        color,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {remaining}
      </span>
    </button>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenPricing }) => {
  const {
    sessions, activeSessionId, selectedModel, selectedCharacter, isTyping,
    setIsTyping, addMessage, createSession, writerMode, setWriterMode,
    trimMessages, customInstructions,
  } = useChatStore();
  const { canSendMessage, incrementMessages, getRemainingMessages, user } = useAuthStore();

  const [input, setInput]               = useState('');
  const [streamingContent, setStreaming] = useState('');
  const [keystrokeCount, setKeystrokes]  = useState(0);
  const [attachment, setAttachment]      = useState<Attachment | null>(null);
  const [showAttachMenu, setAttachMenu]  = useState(false);
  const [activeTab, setActiveTab]        = useState<'chat' | 'image'>('chat');

  const scrollRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const isMobile      = useIsMobile();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages      = activeSession?.messages || [];
  const charLimit     = APP_CONFIG.freeCharLimit;
  const remaining     = getRemainingMessages();
  const character     = AI_CHARACTERS.find((c) => c.id === selectedCharacter) || AI_CHARACTERS[0];
  const userPlan      = user?.plan || 'free';
  const isFree        = !user?.plan || user.plan === 'free';
  const canAttach     = userPlan !== 'free';

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
    if (!showAttachMenu) return;
    const handle = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAttachMenu]);

  const stopGeneration = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; setIsTyping(false); }
  };

  const handleFileSelect = (accept: string) => {
    if (!canAttach) { onOpenPricing(); return; }
    setAttachMenu(false);
    if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); }
  };

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) { alert('Archivo muy grande. Máximo 5MB.'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { alert('Formato no soportado. Usa JPG, PNG, WEBP o PDF.'); return; }

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachment({ type: 'image', data: base64, name: file.name, mimeType: file.type, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = extractPdfText(reader.result as ArrayBuffer);
        setAttachment({ type: 'pdf', data: text || `[PDF: ${file.name}]`, name: file.name, mimeType: file.type });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const extractPdfText = (buffer: ArrayBuffer): string => {
    try {
      const bytes = new Uint8Array(buffer);
      const text  = new TextDecoder('latin1').decode(bytes);
      const matches: string[] = [];
      const btRegex = /BT\s([\s\S]*?)ET/g;
      let m;
      while ((m = btRegex.exec(text)) !== null) {
        const block = m[1];
        const strRegex = /\(([^)]*)\)/g;
        let sm;
        while ((sm = strRegex.exec(block)) !== null) {
          const s = sm[1].replace(/\\n/g, '\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
          if (s.trim()) matches.push(s.trim());
        }
      }
      if (matches.length > 0) return matches.join(' ').slice(0, 8000);
      const plain   = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
      const readable = plain.match(/[a-zA-Z]{3,}/g);
      if (readable && readable.length > 20) return readable.join(' ').slice(0, 8000);
      return '';
    } catch { return ''; }
  };

  const doSend = async (overrideMessages?: Message[], overrideInput?: string) => {
    const textToSend = overrideInput !== undefined ? overrideInput : input;
    if ((!textToSend.trim() && !attachment) || isTyping) return;
    if (!canSendMessage()) { onOpenPricing(); return; }

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    const baseMessages = overrideMessages || messages;
    const userMsg: Message = {
      id: generateId(), role: 'user',
      content: textToSend.trim() || (attachment ? `[${attachment.name}]` : ''),
      timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
      ...(attachment ? { attachment } : {}),
    };

    addMessage(sessionId, userMsg);
    if (!overrideMessages) setInput('');
    setAttachment(null);
    setIsTyping(true);
    setStreaming('');
    incrementMessages();

    const controller  = new AbortController();
    abortRef.current  = controller;
    const msgsToSend  = [...baseMessages, userMsg];

    try {
      let fullResponse = '';
      await sendMessageStream(
        msgsToSend, selectedModel, selectedCharacter,
        (chunk) => { fullResponse += chunk; setStreaming(fullResponse); },
        () => {
          addMessage(sessionId!, {
            id: generateId(), role: 'assistant', content: fullResponse,
            timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
          });
          setStreaming('');
          setIsTyping(false);
        },
        controller.signal
      );
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          const response = await sendMessage(msgsToSend, selectedModel, selectedCharacter);
          addMessage(sessionId!, { id: generateId(), role: 'assistant', content: response, timestamp: Date.now(), model: selectedModel, character: selectedCharacter });
        } catch (err: any) {
          const errorMsg = (err as any)?.message?.includes('límite')
            ? 'Has alcanzado el límite de mensajes. Actualiza tu plan para continuar.'
            : t('chat.error');
          addMessage(sessionId!, { id: generateId(), role: 'assistant', content: errorMsg, timestamp: Date.now() });
        }
      }
      setStreaming('');
      setIsTyping(false);
    } finally {
      abortRef.current = null;
    }
  };

  const handleSend = () => doSend();

  const handleEdit = (content: string, msgIndex: number) => {
    if (!activeSessionId || isTyping) return;
    trimMessages(activeSessionId, msgIndex);
    setInput(content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleRegenerate = () => {
    if (!activeSessionId || isTyping || messages.length < 2) return;
    const lastIdx = messages.length - 1;
    if (messages[lastIdx].role !== 'assistant') return;
    const trimmed = messages.slice(0, lastIdx);
    trimMessages(activeSessionId, lastIdx);
    doSend(trimmed.slice(0, -1), trimmed[trimmed.length - 1]?.content || '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= charLimit) {
      setInput(val);
      setKeystrokes((k) => k + 1);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 14px', borderRadius: 20,
    background: active ? 'var(--bg-el)' : 'transparent',
    border: `1px solid ${active ? 'var(--border-str)' : 'transparent'}`,
    color: active ? 'var(--txt-pri)' : 'var(--txt-mut)',
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <TypingParticles trigger={keystrokeCount} />

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '10px 14px 0' : '12px 20px 0', flexShrink: 0 }}>
        <button style={tabStyle(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
          💬 Chat
        </button>
        <button style={tabStyle(activeTab === 'image')} onClick={() => setActiveTab('image')}>
          <Sparkles size={12} /> Generar imagen
        </button>
      </div>

      <input ref={fileInputRef} type="file" style={{ display: 'none' }}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''; }}
      />

      {activeTab === 'image' && <ImageGenerator onOpenPricing={onOpenPricing} />}

      {activeTab === 'chat' && (
        <>
          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
            {messages.length === 0 && !streamingContent ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ marginBottom: 6, animation: 'fadeIn 0.8s ease' }}>
                  <span style={{ fontSize: isMobile ? 36 : 44, fontWeight: 500, color: 'var(--txt-ghost)', userSelect: 'none' }}>
                    AI<span style={{ opacity: 0.6 }}>dark</span>
                  </span>
                </div>
                <span style={{ fontSize: isMobile ? 9 : 10, color: 'var(--txt-mut)', letterSpacing: 4, textTransform: 'uppercase', animation: 'fadeIn 1.2s ease' }}>
                  {t('app.tagline')}
                </span>
                <p style={{ fontSize: 13, color: 'var(--txt-mut)', marginTop: 14, textAlign: 'center', maxWidth: 300, lineHeight: 1.7, animation: 'fadeIn 1.6s ease' }}>
                  {t('app.privacy')}
                </p>
                {customInstructions && (
                  <div style={{ marginTop: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-sub)' }}>
                    <span style={{ fontSize: 10, color: 'var(--txt-mut)' }}>📌 Instrucciones personalizadas activas</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%', margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 20px', flex: 1 }}>
                {messages.map((msg, idx) => {
                  const isLastMsg = idx === messages.length - 1;
                  const isLastAI  = isLastMsg && msg.role === 'assistant';
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      index={idx}
                      isLast={isLastAI}
                      onEdit={msg.role === 'user' ? handleEdit : undefined}
                      onRegenerate={isLastAI ? handleRegenerate : undefined}
                    />
                  );
                })}
                {isTyping && streamingContent && (
                  <MessageBubble
                    message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now(), model: selectedModel, character: selectedCharacter }}
                    index={messages.length}
                  />
                )}
                {isTyping && !streamingContent && (
                  <div style={{ paddingLeft: isMobile ? 0 : 34, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: character.color, animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
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

          {/* Input Area */}
          <div style={{
            padding: messages.length === 0
              ? (isMobile ? '0 12px 24px' : '0 20px 40px')
              : (isMobile ? '0 12px 14px' : '0 20px 20px'),
            display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 2,
          }}>
            <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%' }}>

              {/* Attachment preview */}
              {attachment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 6, background: 'var(--bg-el)', borderRadius: 10, border: '1px solid var(--border-sub)' }}>
                  {attachment.type === 'image' && attachment.preview ? (
                    <img src={attachment.preview} alt={attachment.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(160,81,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} style={{ color: 'var(--danger)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--txt-pri)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachment.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--txt-mut)' }}>{attachment.type === 'image' ? 'Imagen' : 'PDF'}</div>
                  </div>
                  <button onClick={() => setAttachment(null)} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Textarea box */}
              <div
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: isMobile ? 12 : 14, padding: isMobile ? '10px 12px 8px' : '12px 16px 8px', transition: 'border-color 0.2s' }}
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
                  style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--txt-pri)', lineHeight: 1.6, minHeight: 24, maxHeight: 160, overflowY: 'auto', overflowX: 'hidden', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* Attach */}
                    <div style={{ position: 'relative' }} ref={attachMenuRef}>
                      <button
                        onClick={() => { if (!canAttach) { onOpenPricing(); return; } setAttachMenu(!showAttachMenu); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: showAttachMenu ? 'var(--bg-hover)' : 'transparent', border: '1px solid var(--border-sub)', color: canAttach ? 'var(--txt-sec)' : 'var(--txt-ghost)', cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        <Plus size={15} />
                      </button>
                      {showAttachMenu && (
                        <div style={{ position: 'absolute', bottom: 36, left: 0, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 10, padding: 4, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                          <button onClick={() => handleFileSelect(ALLOWED_IMAGE_TYPES.join(','))} style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderRadius: 6, color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Image size={14} style={{ color: '#6b8f71' }} /> Foto o imagen
                          </button>
                          <button onClick={() => handleFileSelect(ALLOWED_PDF_TYPES.join(','))} style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderRadius: 6, color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <FileText size={14} style={{ color: '#c9944a' }} /> Archivo PDF
                          </button>
                        </div>
                      )}
                    </div>

                    <CharacterSelector />

                    {!isMobile && messages.length > 0 && (
                      <button onClick={() => setWriterMode(!writerMode)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: `1px solid ${writerMode ? 'var(--border-str)' : 'var(--border-sub)'}`, borderRadius: 16, background: writerMode ? 'var(--bg-hover)' : 'transparent', color: writerMode ? 'var(--txt-pri)' : 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {writerMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                        {writerMode ? t('chat.normal') : t('chat.writer')}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: input.length > charLimit * 0.9 ? 'var(--danger)' : 'var(--txt-mut)' }}>
                      {input.length}/{charLimit}
                    </span>

                    {/* Círculo de progreso — solo usuarios free */}
                    {isFree && remaining < 999 && (
                      <MessageProgressCircle
                        remaining={remaining}
                        total={FREE_LIMIT}
                        onClick={onOpenPricing}
                      />
                    )}

                    {isTyping ? (
                      <button onClick={stopGeneration} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'var(--danger)', border: 'none', borderRadius: '50%', cursor: 'pointer' }}>
                        <Square size={12} fill="#fff" color="#fff" />
                      </button>
                    ) : (
                      <button onClick={handleSend} disabled={(!input.trim() && !attachment) || isTyping} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: (input.trim() || attachment) ? 'var(--border-str)' : 'var(--bg-el)', border: 'none', borderRadius: 8, color: (input.trim() || attachment) ? 'var(--txt-pri)' : 'var(--txt-mut)', cursor: (input.trim() || attachment) ? 'pointer' : 'default', transition: 'all 0.2s', animation: (input.trim() || attachment) ? 'glow 2s ease-in-out infinite' : 'none' }}>
                        <Send size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '0 4px' }}>
                <span style={{ fontSize: 10, color: 'var(--txt-ghost)' }}>{t('app.chats_private')}</span>
                {/* Texto de mensajes restantes solo cuando queda poco */}
                {isFree && remaining <= 3 && (
                  <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 500 }}>
                    {remaining === 0 ? 'Sin mensajes — ' : `${remaining} restantes — `}
                    <span
                      onClick={onOpenPricing}
                      style={{ textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      Obtener más
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
