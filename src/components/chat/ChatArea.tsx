// ═══════════════════════════════════════
// AIdark — Chat Area (FIXED + STREAMING)
// ═══════════════════════════════════════

import React, { useRef, useEffect, useState } from 'react';
import { Send, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { sendMessageStream, sendMessage } from '@/services/venice';
import { generateId } from '@/lib/utils';
import { APP_CONFIG, AI_CHARACTERS, PROMPT_GALLERY } from '@/lib/constants';
import { MessageBubble } from './MessageBubble';
import { ModelSelector } from './ModelSelector';
import { CharacterSelector } from './CharacterSelector';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Message } from '@/types';

interface ChatAreaProps {
  onOpenPricing: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onOpenPricing }) => {
  const {
    sessions, activeSessionId, selectedModel, selectedCharacter, isTyping,
    setIsTyping, addMessage, createSession, writerMode, setWriterMode,
  } = useChatStore();
  const { canSendMessage, incrementMessages, getRemainingMessages } = useAuthStore();
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const charLimit = APP_CONFIG.freeCharLimit;
  const remaining = getRemainingMessages();
  const character = AI_CHARACTERS.find((c) => c.id === selectedCharacter) || AI_CHARACTERS[0];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, streamingContent]);

  useEffect(() => { textareaRef.current?.focus(); }, [activeSessionId]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (!canSendMessage()) {
      onOpenPricing();
      return;
    }

    let sessionId = activeSessionId;
    if (!sessionId) sessionId = createSession();

    const userMsg: Message = {
      id: generateId(), role: 'user', content: input.trim(),
      timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
    };

    addMessage(sessionId, userMsg);
    setInput('');
    setIsTyping(true);
    setStreamingContent('');
    incrementMessages();

    try {
      // Try streaming first
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
          // On done - add the complete message
          addMessage(sessionId!, {
            id: generateId(), role: 'assistant', content: fullResponse,
            timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
          });
          setStreamingContent('');
          setIsTyping(false);
        }
      );
    } catch (error) {
      // Fallback to non-streaming
      try {
        const response = await sendMessage([...messages, userMsg], selectedModel, selectedCharacter);
        addMessage(sessionId!, {
          id: generateId(), role: 'assistant', content: response,
          timestamp: Date.now(), model: selectedModel, character: selectedCharacter,
        });
      } catch {
        addMessage(sessionId!, {
          id: generateId(), role: 'assistant',
          content: '⚠️ Error de conexión. Intenta de nuevo.',
          timestamp: Date.now(),
        });
      }
      setStreamingContent('');
      setIsTyping(false);
    }
  };

  const handlePrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= charLimit) setInput(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        padding: writerMode ? '0' : undefined,
      }}>
        {messages.length === 0 && !streamingContent ? (
          /* ── Empty State ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}>
            {/* Logo */}
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
              sin censura
            </span>
            <p style={{
              fontSize: 13, color: 'var(--txt-mut)', marginTop: 14,
              textAlign: 'center', maxWidth: 300, lineHeight: 1.7,
              animation: 'fadeIn 1.6s ease',
            }}>
              Tus chats son privados y se eliminan automáticamente.
            </p>

        ) : (
          /* ── Messages ── */
          <div style={{
            maxWidth: writerMode ? 900 : 720, width: '100%', margin: '0 auto',
            padding: isMobile ? '16px 14px' : '24px 20px', flex: 1,
          }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} index={idx} />
            ))}
            {/* Streaming message */}
            {isTyping && streamingContent && (
              <MessageBubble
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: Date.now(),
                  model: selectedModel,
                  character: selectedCharacter,
                }}
                index={messages.length}
              />
            )}
            {/* Typing indicator (before streaming starts) */}
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
                    {character.name} escribiendo...
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
      }}>
        <div style={{ maxWidth: writerMode ? 900 : 720, width: '100%' }}>
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
              placeholder={`Escribe a ${character.name}...`}
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

            {/* Controls */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 8, gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <ModelSelector />
                <CharacterSelector />
                {/* Writer mode toggle */}
                {!isMobile && messages.length > 0 && (
                  <button onClick={() => setWriterMode(!writerMode)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', border: `1px solid ${writerMode ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    borderRadius: 16, background: writerMode ? 'var(--bg-hover)' : 'transparent',
                    color: writerMode ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>
                    {writerMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                    {writerMode ? 'Normal' : 'Escritor'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Char counter */}
                <span style={{
                  fontSize: 10,
                  color: input.length > charLimit * 0.9 ? 'var(--danger)' : 'var(--txt-mut)',
                }}>
                  {input.length}/{charLimit}
                </span>
                {/* Send */}
                <button onClick={handleSend} disabled={!input.trim() || isTyping} style={{
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() ? 'var(--border-str)' : 'var(--bg-el)',
                  border: 'none', borderRadius: 8,
                  color: input.trim() ? 'var(--txt-pri)' : 'var(--txt-mut)',
                  cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
                  animation: input.trim() ? 'glow 2s ease-in-out infinite' : 'none',
                }}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 6, padding: '0 4px',
          }}>
            <span style={{ fontSize: 10, color: 'var(--txt-ghost)' }}>
              Chats privados · +18
            </span>
            <span style={{ fontSize: 10, color: remaining <= 2 ? 'var(--danger)' : 'var(--txt-ghost)' }}>
              {remaining >= 999 ? '∞' : remaining} msgs restantes hoy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
