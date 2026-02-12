// ═══════════════════════════════════════
// AIdark — Chat Area v3
// ═══════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Send, Copy } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessage } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { ModelSelector } from './ModelSelector';
import type { Message } from '@/types';

export const ChatArea: React.FC = () => {
  const {
    sessions, activeSessionId, selectedModel, isTyping,
    setIsTyping, addMessage, createSession,
  } = useChatStore();
  const { canSendMessage, incrementMessages } = useAuthStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!canSendMessage()) {
      alert('Has alcanzado el límite de mensajes gratuitos. Activa Premium para continuar.');
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      model: selectedModel,
    };

    addMessage(sessionId, userMessage);
    setInput('');
    setIsTyping(true);
    incrementMessages();

    try {
      const response = await sendMessage([...messages, userMessage], selectedModel);
      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        model: selectedModel,
      };
      addMessage(sessionId, aiMessage);
    } catch (error) {
      console.error('[AIdark] Error:', error);
      addMessage(sessionId, {
        id: generateId(),
        role: 'assistant',
        content: 'Error de conexión. Verifica tu configuración e intenta de nuevo.',
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          /* ── Empty State ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20, gap: 6,
          }}>
            <span style={{
              fontSize: 42, fontWeight: 500, color: 'var(--txt-ghost)',
              letterSpacing: -0.5, userSelect: 'none',
              animation: 'fadeIn 0.8s ease',
            }}>
              AI<span style={{ opacity: 0.6 }}>dark</span>
            </span>
            <span style={{
              fontSize: 11, color: 'var(--txt-mut)', letterSpacing: 3,
              textTransform: 'uppercase', animation: 'fadeIn 1.2s ease',
            }}>
              sin censura
            </span>
            <p style={{
              fontSize: 13, color: 'var(--txt-mut)', marginTop: 16,
              textAlign: 'center', maxWidth: 320, lineHeight: 1.7,
              animation: 'fadeIn 1.6s ease',
            }}>
              Tus chats son privados y se eliminan automáticamente. Nadie tiene acceso a tus conversaciones.
            </p>
          </div>
        ) : (
          /* ── Message List ── */
          <div style={{
            maxWidth: 720, width: '100%', margin: '0 auto',
            padding: '24px 20px', flex: 1,
          }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} index={idx} />
            ))}

            {/* Typing */}
            {isTyping && (
              <div style={{ paddingLeft: 32, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)',
                        animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--txt-ter)', fontWeight: 500, letterSpacing: 0.5 }}>
                    AIdark procesando...
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: messages.length === 0 ? '0 20px 40px' : '0 20px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
              borderRadius: 16, padding: '14px 18px 10px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
              transition: 'border-color 0.25s, box-shadow 0.25s',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe lo que quieras explorar..."
              rows={1}
              style={{
                width: '100%', background: 'transparent', border: 'none', resize: 'none',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 14,
                color: 'var(--txt-pri)', lineHeight: 1.6, minHeight: 24, maxHeight: 160,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
              <ModelSelector />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() ? 'var(--border-str)' : 'var(--bg-el)',
                  border: 'none', borderRadius: 8,
                  color: input.trim() ? 'var(--txt-pri)' : 'var(--txt-mut)',
                  cursor: input.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  animation: input.trim() ? 'glow 2s ease-in-out infinite' : 'none',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--txt-ghost)', textAlign: 'center', marginTop: 8 }}>
            Chats privados · Se eliminan automáticamente · +18
          </p>
        </div>
      </div>
    </div>
  );
};
