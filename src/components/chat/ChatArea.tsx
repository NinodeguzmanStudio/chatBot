// ═══════════════════════════════════════
// AIdark — Chat Area Component
// ═══════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessage } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { APP_CONFIG } from '@/lib/constants';
import { MessageBubble } from './MessageBubble';
import { ModelSelector } from './ModelSelector';
import type { Message } from '@/types';

export const ChatArea: React.FC = () => {
  const {
    sessions, activeSessionId, selectedModel, isTyping,
    setIsTyping, addMessage, createSession,
  } = useChatStore();
  const { canSendMessage, incrementMessages } = useAuthStore();
  const [input, setInput] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Auto focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeSessionId]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!canSendMessage()) {
      // TODO: Show pricing modal
      alert('Has alcanzado el límite de mensajes gratuitos. Activa Premium para continuar.');
      return;
    }

    // Create session if none active
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
      const response = await sendMessage(
        [...messages, userMessage],
        selectedModel
      );

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
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Error de conexión. Verifica tu configuración e intenta de nuevo.',
        timestamp: Date.now(),
      };
      addMessage(sessionId, errorMessage);
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
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center">
            <span style={{
              fontSize: 32, fontWeight: 500,
              color: 'var(--border-default)',
              letterSpacing: '-0.5px',
              userSelect: 'none',
            }}>
              AI<span style={{ color: 'var(--border-subtle)' }}>dark</span>
            </span>
          </div>
        ) : (
          /* Message list */
          <div style={{
            maxWidth: 720, width: '100%',
            margin: '0 auto',
            padding: '24px 20px',
            flex: 1,
          }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} index={idx} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div
                className="flex items-center gap-2 animate-fade-up"
                style={{ paddingLeft: 30, marginBottom: 24 }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse-soft"
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--text-tertiary)',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Input area ── */}
      <div
        className="flex flex-col items-center flex-shrink-0"
        style={{
          padding: messages.length === 0 ? '0 20px 40px' : '0 20px 24px',
        }}
      >
        <div style={{ maxWidth: 720, width: '100%' }}>
          {/* Input box */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              padding: '14px 18px 10px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
                width: '100%',
                background: 'transparent',
                border: 'none',
                resize: 'none',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 14,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                minHeight: 24,
                maxHeight: 160,
              }}
            />

            {/* Bottom toolbar */}
            <div
              className="flex items-center justify-between"
              style={{ marginTop: 10 }}
            >
              <ModelSelector />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="flex items-center justify-center transition-default"
                style={{
                  width: 32, height: 32,
                  background: input.trim() ? 'var(--border-strong)' : 'var(--bg-elevated)',
                  borderRadius: 8,
                  color: input.trim() ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: input.trim() ? 'pointer' : 'default',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{
            fontSize: 11,
            color: 'var(--text-ghost)',
            textAlign: 'center',
            marginTop: 10,
          }}>
            AIdark genera contenido bajo tu responsabilidad · +18
          </p>
        </div>
      </div>
    </div>
  );
};
