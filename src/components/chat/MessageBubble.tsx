// ═══════════════════════════════════════
// AIdark — Message Bubble (FIXED)
// src/components/chat/MessageBubble.tsx
// FIX: acciones movidas DEBAJO del contenido (estilo Venice)
//      antes estaban arriba en el header — no se veían bien
// ═══════════════════════════════════════

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, FileText, Pencil, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AI_CHARACTERS } from '@/lib/constants';
import { formatTime } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  index: number;
  isLast?: boolean;
  onEdit?: (content: string, index: number) => void;
  onRegenerate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, index, isLast = false, onEdit, onRegenerate,
}) => {
  const isUser    = message.role === 'user';
  const [copied, setCopied]         = useState(false);
  const [codeCopied, setCodeCopied] = useState<string | null>(null);
  const [hovered, setHovered]       = useState(false);
  const [feedback, setFeedback]     = useState<'up' | 'down' | null>(null);
  const isMobile  = useIsMobile();
  const character = AI_CHARACTERS.find((c) => c.id === (message.character || 'default')) || AI_CHARACTERS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCodeCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(code);
    setTimeout(() => setCodeCopied(null), 1500);
  };

  // Estilo de botón de acción
  const actionBtn = (active = false, danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 9px', borderRadius: 7, border: '1px solid transparent',
    background: active
      ? danger ? 'rgba(180,80,80,0.15)' : 'rgba(100,180,100,0.12)'
      : 'transparent',
    color: active
      ? (danger ? '#c66' : '#6b8')
      : 'var(--txt-mut)',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{ marginBottom: isMobile ? 24 : 32, animation: 'fadeUp 0.35s ease both', animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Header: avatar + nombre + hora ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <div style={{
          width: isMobile ? 28 : 30, height: isMobile ? 28 : 30, borderRadius: '50%',
          background: isUser ? 'var(--bg-hover)' : 'var(--bg-el)',
          border: `1.5px solid ${isUser ? 'var(--border-def)' : character.color + '55'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
          color: isUser ? 'var(--txt-sec)' : character.color,
          flexShrink: 0,
        }}>
          {isUser ? 'T' : character.avatar}
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: isUser ? 'var(--txt-sec)' : character.color }}>
          {isUser ? t('chat.you') : character.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>{formatTime(message.timestamp)}</span>
      </div>

      {/* ── Contenido ── */}
      <div style={{
        paddingLeft: isMobile ? 0 : 39,
        maxWidth: isUser ? 760 : 820,
      }}>

        {/* Attachment */}
        {message.attachment && (
          <div style={{ marginBottom: 8 }}>
            {message.attachment.type === 'image' && message.attachment.preview && (
              <img
                src={message.attachment.preview}
                alt={message.attachment.name}
                style={{
                  maxWidth: isMobile ? '100%' : 320, maxHeight: 240,
                  borderRadius: 10, border: '1px solid var(--border-sub)',
                  objectFit: 'contain', display: 'block',
                }}
              />
            )}
            {message.attachment.type === 'pdf' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 9,
                background: 'rgba(201,148,74,0.1)', border: '1px solid rgba(201,148,74,0.24)',
              }}>
                <FileText size={16} style={{ color: '#c9944a' }} />
                <span style={{ fontSize: 13, color: 'var(--txt-sec)', fontWeight: 600 }}>{message.attachment.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Texto */}
        {isUser ? (
          <p style={{
            fontSize: isMobile ? 15 : 15.5,
            lineHeight: 1.78,
            color: 'var(--txt-sec)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            padding: isMobile ? '0 0 0 2px' : '0 0 0 1px',
          }}>
            {message.content}
          </p>
        ) : (
          <div
            className="markdown-content"
            style={{
              fontSize: isMobile ? 15 : 16,
              lineHeight: 1.82,
              color: 'var(--txt-pri)',
              wordBreak: 'break-word',
              letterSpacing: 0,
            }}
          >
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }: any) {
                  const match      = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isInline   = !match && !codeString.includes('\n');

                  if (isInline) {
                    return (
                      <code style={{
                        background: 'rgba(255,255,255,0.08)', padding: '2px 6px',
                        borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace',
                        color: 'var(--accent)',
                      }} {...props}>
                        {children}
                      </code>
                    );
                  }

                  const lang     = match ? match[1] : 'text';
                  const isCopied = codeCopied === codeString;

                  return (
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.4)', padding: '6px 12px',
                        borderRadius: '8px 8px 0 0',
                        border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--txt-mut)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {lang}
                        </span>
                        <button
                          onClick={() => handleCodeCopy(codeString)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: isCopied ? '#6b8' : 'var(--txt-mut)', fontSize: 10, cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          {isCopied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: '15px 17px',
                          borderRadius: '0 0 8px 8px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#121218',
                          color: '#f4f1ea',
                          fontSize: 13,
                          lineHeight: 1.7,
                          overflowX: 'auto',
                        }}
                      >
                        <code
                          style={{
                            fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                            whiteSpace: 'pre',
                          }}
                          {...props}
                        >
                          {codeString}
                        </code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* ── Acciones DEBAJO del contenido (estilo Venice) ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          marginTop: 8,
          // En desktop: visible solo en hover. En mobile: siempre visible.
          opacity: hovered || isMobile ? 1 : 0,
          transition: 'opacity 0.18s',
          pointerEvents: hovered || isMobile ? 'auto' : 'none',
        }}>
          {/* Copiar — todos los mensajes */}
          <button onClick={handleCopy} style={actionBtn(copied)} title="Copiar">
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? (t('chat.copied') || 'Copiado') : (t('chat.copy') || 'Copiar')}</span>
          </button>

          {/* Editar — solo mensajes del usuario */}
          {isUser && onEdit && (
            <button onClick={() => onEdit(message.content, index)} style={actionBtn()} title="Editar y reenviar">
              <Pencil size={12} />
              <span>Editar</span>
            </button>
          )}

          {/* Regenerar — solo último mensaje de la IA */}
          {!isUser && isLast && onRegenerate && (
            <button onClick={onRegenerate} style={actionBtn()} title="Regenerar respuesta">
              <RotateCcw size={12} />
              <span>Regenerar</span>
            </button>
          )}

          {/* Thumbs — solo mensajes de la IA */}
          {!isUser && (
            <>
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                style={actionBtn(feedback === 'up')}
                title="Buena respuesta"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                style={actionBtn(feedback === 'down', true)}
                title="Mala respuesta"
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
