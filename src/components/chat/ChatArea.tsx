// ═══════════════════════════════════════
// AIdark — Chat Area v2
// src/components/chat/ChatArea.tsx
// FIXES v2:
//   [1] PDF: usa pdfUtils.ts con pdf.js real (antes regex roto)
//   [2] Export PDF: nuevo botón para exportar chat como PDF
//   [3] Borrada función extractPdfText vieja
// ═══════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Send, Maximize2, Minimize2, Square, Plus, X, Image, FileText, Sparkles, Download } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessageStream, sendMessage, ApiError } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { APP_CONFIG, AI_CHARACTERS } from '@/lib/constants';
import { MessageBubble } from './MessageBubble';
import { CharacterSelector } from './CharacterSelector';
import { TypingParticles } from './TypingParticles';
import { ImageGenerator } from './ImageGenerator';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';
import { extractPdfText, exportChatToPdf } from '@/lib/pdfUtils';
import type { Message, Attachment } from '@/types';

const MAX_FILE_SIZE       = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPES   = ['application/pdf'];
const ALLOWED_TYPES       = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];
const FREE_LIMIT          = APP_CONFIG.freeMessageLimit;
const MEMORY_KEY          = 'aidark_memory';

const LIMIT_CODES    = new Set(['FREE_LIMIT_REACHED', 'PLAN_EXPIRED', 'PREMIUM_REQUIRED']);
const LIMIT_KEYWORDS = ['límite', 'limite', 'limit', 'plan', 'upgrade', 'actualiza', 'gratuito'];

function isLimitError(err: unknown): boolean {
  if (err instanceof ApiError) return LIMIT_CODES.has(err.code);
  if (err instanceof Error) return LIMIT_KEYWORDS.some(k => err.message.toLowerCase().includes(k));
  return false;
}

interface ChatAreaProps {
  onOpenPricing: () => void;
}

const MessageProgressCircle: React.FC<{ remaining: number; total: number; onClick: () => void }> = ({ remaining, total, onClick }) => {
  const size = 32, stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min((total - remaining) / total, 1));
  const color  = remaining <= 2 ? '#e05555' : remaining <= 5 ? '#c9944a' : '#6b8a5e';
  return (
    <button onClick={onClick} title={`${remaining} mensajes restantes hoy`}
      style={{ position: 'relative', width: size, height: size, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--border-sub)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }} />
      </svg>
      <span style={{ position: 'absolute', fontSize: remaining >= 10 ? 9 : 10, fontWeight: 600, color, lineHeight: 1, userSelect: 'none' }}>
        {remaining}
      </span>
    </button>
  );
};

const ThinkingDots: React.FC<{ color: string; name: string }> = ({ color, name }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
    <div style={{ display: 'flex', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: color, animation: `dotPulse 1.8s ease-in-out ${i * 0.25}s infinite`, boxShadow: `0 0 6px ${color}88` }} />
      ))}
    </div>
    <span style={{ fontSize: 12, color: 'var(--txt-ter)', fontWeight: 500, fontStyle: 'italic' }}>
      {name} pensando...
    </span>
  </div>
);

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
  const [streamChunkCount, setStreamChunks] = useState(0);
  const [attachment, setAttachment]      = useState<Attachment | null>(null);
  const [showAttachMenu, setAttachMenu]  = useState(false);
  const [activeTab, setActiveTab]        = useState<'chat' | 'image'>('chat');

  const scrollRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const lastResponseRef = useRef<HTMLDivElement>(null);
  const wasTypingRef    = useRef(false);
  const isMobile      = useIsMobile();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages      = activeSession?.messages || [];
  const charLimit     = APP_CONFIG.freeCharLimit;
  const remaining     = getRemainingMessages();
  const character     = AI_CHARACTERS.find((c) => c.id === selectedCharacter) || AI_CHARACTERS[0];
  const userPlan      = user?.plan || 'free';
  const isFree        = !user?.plan || user.plan === 'free';
  const canAttach     = userPlan !== 'free';

  // Smart scroll:
  // - Durante streaming → bajar al final (el usuario ve el texto apareciendo)
  // - Cuando termina la respuesta → scroll al INICIO de la respuesta de la IA
  useEffect(() => {
    if (!scrollRef.current) return;

    if (isTyping) {
      // Streaming activo: bajar al final
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      wasTypingRef.current = true;
    } else if (wasTypingRef.current) {
      // Acaba de terminar de escribir: scroll al inicio de la última respuesta
      wasTypingRef.current = false;
      setTimeout(() => {
        if (lastResponseRef.current && scrollRef.current) {
          const container = scrollRef.current;
          const element   = lastResponseRef.current;
          const offset    = element.offsetTop - container.offsetTop - 16; // 16px de padding arriba
          container.scrollTo({ top: offset, behavior: 'smooth' });
        }
      }, 100); // Pequeño delay para que el DOM se actualice
    }
  }, [messages, isTyping, streamingContent]);

  useEffect(() => { textareaRef.current?.focus(); }, [activeSessionId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
  }, [input]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const handle = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setAttachMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAttachMenu]);

  useEffect(() => {
    if (!isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, offset)}px`);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, [isMobile]);

  const stopGeneration = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; setIsTyping(false); }
  };

  const handleExport = () => {
    if (!messages.length) return;
    const title   = activeSession?.title || 'chat';
    const date    = new Date().toLocaleDateString('es-AR');
    const content = messages.map((m) => {
      const who  = m.role === 'user' ? 'Tú' : character.name;
      const time = new Date(m.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      return `[${time}] ${who}:\n${m.content}\n`;
    }).join('\n---\n\n');
    const full = `AIdark — ${title}\nFecha: ${date}\n${'='.repeat(40)}\n\n${content}`;
    const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'chat'}-aidark.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  // NEW: exportar como PDF
  const handleExportPdf = () => {
    if (!messages.length) return;
    exportChatToPdf(messages, activeSession?.title || 'Chat AIdark', character.name);
  };

  const handleFileSelect = (accept: string) => {
    if (!canAttach) { onOpenPricing(); return; }
    setAttachMenu(false);
    if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); }
  };

  // FIX v2: processFile usa pdfUtils.ts con pdf.js real
  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) { alert('Archivo muy grande. Máximo 3MB.'); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { alert('Formato no soportado. Usa JPG, PNG, WEBP o PDF.'); return; }

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 800;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
          else       { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.70);
        setAttachment({ type: 'image', data: compressed.split(',')[1], name: file.name, mimeType: 'image/jpeg', preview: compressed });
      };
      img.src = objectUrl;
    } else if (file.type === 'application/pdf') {
      // FIX v2: usa pdf.js real en vez del regex roto
      try {
        const text = await extractPdfText(file);
        setAttachment({ type: 'pdf', data: text, name: file.name, mimeType: file.type });
      } catch {
        setAttachment({ type: 'pdf', data: `[PDF: ${file.name} — Error al leer]`, name: file.name, mimeType: file.type });
      }
    }
  };

  // extractPdfText viejo ELIMINADO — ahora viene de @/lib/pdfUtils

  const doSend = async (overrideMessages?: Message[], overrideInput?: string) => {
    const textToSend = overrideInput !== undefined ? overrideInput : input;
    if ((!textToSend.trim() && !attachment) || isTyping) return;
    if (!canSendMessage()) { onOpenPricing(); return; }

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    const baseMessages  = overrideMessages || messages;
    const savedMemory   = localStorage.getItem(MEMORY_KEY)?.trim();

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
    setStreamChunks(0);
    incrementMessages();

    const controller = new AbortController();
    abortRef.current = controller;

    let msgsToSend = [...baseMessages, userMsg];
    const contextParts: string[] = [];
    if (customInstructions?.trim()) contextParts.push(`Instrucciones del usuario: ${customInstructions.trim()}`);
    if (savedMemory) contextParts.push(`Memoria persistente (recordar siempre): ${savedMemory}`);
    if (contextParts.length > 0) {
      msgsToSend = [
        { id: generateId(), role: 'user', content: `[CONTEXTO PRIVADO — no mencionar al usuario]\n${contextParts.join('\n\n')}`, timestamp: Date.now() - 1 } as Message,
        ...msgsToSend,
      ];
    }

    try {
      let fullResponse  = '';
      let chunkCounter  = 0;

      await sendMessageStream(
        msgsToSend, selectedModel, selectedCharacter,
        (chunk) => {
          fullResponse += chunk;
          setStreaming(fullResponse);
          chunkCounter++;
          if (chunkCounter % 3 === 0) setStreamChunks(c => c + 1);
        },
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
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStreaming(''); setIsTyping(false); return;
      }

      if (isLimitError(error)) {
        const limitMsg = 'Has alcanzado el límite de mensajes. Actualiza tu plan para continuar.';
        addMessage(sessionId!, { id: generateId(), role: 'assistant', content: limitMsg, timestamp: Date.now() });
        setStreaming(''); setIsTyping(false);
        return;
      }

      try {
        const response = await sendMessage(msgsToSend, selectedModel, selectedCharacter);
        addMessage(sessionId!, { id: generateId(), role: 'assistant', content: response, timestamp: Date.now(), model: selectedModel, character: selectedCharacter });
      } catch (err: unknown) {
        const errorMsg = isLimitError(err)
          ? 'Has alcanzado el límite de mensajes. Actualiza tu plan para continuar.'
          : t('chat.error');
        addMessage(sessionId!, { id: generateId(), role: 'assistant', content: errorMsg, timestamp: Date.now() });
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
    if (val.length <= charLimit) { setInput(val); setKeystrokes((k) => k + 1); }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20,
    background: active ? 'var(--bg-el)' : 'transparent',
    border: `1px solid ${active ? 'var(--border-str)' : 'transparent'}`,
    color: active ? 'var(--txt-pri)' : 'var(--txt-mut)',
    fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative', overflow: 'hidden' }}>
      <TypingParticles trigger={keystrokeCount} streamTrigger={streamChunkCount} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '10px 14px 0' : '12px 20px 0', flexShrink: 0 }}>
        <button style={tabStyle(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>💬 Chat</button>
        <button style={tabStyle(activeTab === 'image')} onClick={() => setActiveTab('image')}>
          <Sparkles size={12} /> Generar imagen
        </button>
        {messages.length > 0 && activeTab === 'chat' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button onClick={handleExport} title="Exportar como .txt"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 16, background: 'transparent', border: '1px solid var(--border-sub)', color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-str)'; e.currentTarget.style.color='var(--txt-sec)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-sub)'; e.currentTarget.style.color='var(--txt-mut)'; }}
            >
              <Download size={11} /> TXT
            </button>
            <button onClick={handleExportPdf} title="Exportar como PDF"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 16, background: 'transparent', border: '1px solid var(--border-sub)', color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-str)'; e.currentTarget.style.color='var(--txt-sec)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-sub)'; e.currentTarget.style.color='var(--txt-mut)'; }}
            >
              <FileText size={11} /> PDF
            </button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" style={{ display: 'none' }}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''; }}
      />

      {activeTab === 'image' && <ImageGenerator onOpenPricing={onOpenPricing} />}

      {activeTab === 'chat' && (
        <>
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
                {(customInstructions || localStorage.getItem(MEMORY_KEY)) && (
                  <div style={{ marginTop: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-sub)', display: 'flex', gap: 10 }}>
                    {customInstructions && <span style={{ fontSize: 10, color: 'var(--txt-mut)' }}>📌 Instrucciones activas</span>}
                    {localStorage.getItem(MEMORY_KEY) && <span style={{ fontSize: 10, color: 'var(--txt-mut)' }}>🧠 Memoria activa</span>}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%', margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 20px', flex: 1 }}>
                {messages.map((msg, idx) => {
                  const isLastMsg = idx === messages.length - 1;
                  const isLastAI  = isLastMsg && msg.role === 'assistant';
                  return (
                    <div key={msg.id} ref={isLastAI ? lastResponseRef : undefined}>
                      <MessageBubble
                        message={msg} index={idx} isLast={isLastAI}
                        onEdit={msg.role === 'user' ? handleEdit : undefined}
                        onRegenerate={isLastAI ? handleRegenerate : undefined}
                      />
                    </div>
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
                    <ThinkingDots color={character.color} name={character.name} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{
            padding: messages.length === 0
              ? (isMobile ? '0 12px 24px' : '0 20px 40px')
              : (isMobile ? '0 12px 14px' : '0 20px 20px'),
            paddingBottom: isMobile
              ? `calc(${messages.length === 0 ? '24px' : '14px'} + var(--keyboard-height, 0px))`
              : undefined,
            display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 2,
          }}>
            <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%' }}>

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
                  style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--txt-pri)', lineHeight: 1.6, minHeight: 24, maxHeight: 160, overflowY: 'auto', overflowX: 'hidden', wordWrap: 'break-word', whiteSpace: 'pre-wrap', caretColor: 'var(--accent)' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                    {isFree && remaining < 999 && (
                      <MessageProgressCircle remaining={remaining} total={FREE_LIMIT} onClick={onOpenPricing} />
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
                {isFree && remaining <= 3 && (
                  <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 500 }}>
                    {remaining === 0 ? 'Sin mensajes — ' : `${remaining} restantes — `}
                    <span onClick={onOpenPricing} style={{ textDecoration: 'underline', cursor: 'pointer' }}>Obtener más</span>
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
