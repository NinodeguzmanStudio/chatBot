// ═══════════════════════════════════════
// AIdark — Message Bubble v3
// Features: copy, edit, regenerate, thumbs up/down, syntax highlighting
// ═══════════════════════════════════════

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const isMobile = useIsMobile();
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

  const btn = (active = false, danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 5, border: 'none',
    background: active
      ? danger ? 'rgba(180,80,80,0.15)' : 'rgba(100,180,100,0.12)'
      : 'transparent',
    color: active ? (danger ? '#c66' : '#6b8') : 'var(--txt-mut)',
    fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div
      style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease both', animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: isUser ? 'var(--bg-hover)' : 'var(--bg-el)',
            border: `1.5px solid ${isUser ? 'var(--border-def)' : character.color + '55'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
            color: isUser ? 'var(--txt-sec)' : character.color,
          }}>
            {isUser ? 'T' : character.avatar}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isUser ? 'var(--txt-sec)' : character.color }}>
            {isUser ? t('chat.you') : character.name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>{formatTime(message.timestamp)}</span>
        </div>

        {/* Action buttons — visible on hover or mobile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          opacity: hovered || isMobile ? 1 : 0,
          transition: 'opacity 0.18s',
          pointerEvents: hovered || isMobile ? 'auto' : 'none',
        }}>
          {/* Copy — todos */}
          <button onClick={handleCopy} style={btn(copied)} title="Copiar">
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? t('chat.copied') : t('chat.copy')}</span>
          </button>

          {/* Edit — solo usuario */}
          {isUser && onEdit && (
            <button onClick={() => onEdit(message.content, index)} style={btn()} title="Editar y reenviar">
              <Pencil size={11} />
              <span>Editar</span>
            </button>
          )}

          {/* Regenerar — solo último mensaje IA */}
          {!isUser && isLast && onRegenerate && (
            <button onClick={onRegenerate} style={btn()} title="Regenerar respuesta">
              <RotateCcw size={11} />
              <span>Regenerar</span>
            </button>
          )}

          {/* Thumbs — solo IA */}
          {!isUser && (
            <>
              <button
                onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                style={btn(feedback === 'up')}
                title="Buena respuesta"
              >
                <ThumbsUp size={11} />
              </button>
              <button
                onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                style={btn(feedback === 'down', true)}
                title="Mala respuesta"
              >
                <ThumbsDown size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingLeft: isMobile ? 0 : 34 }}>
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
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(201,148,74,0.08)', border: '1px solid rgba(201,148,74,0.2)',
              }}>
                <FileText size={16} style={{ color: '#c9944a' }} />
                <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{message.attachment.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Text */}
        {isUser ? (
          <p style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.8, color: 'var(--txt-sec)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        ) : (
          <div className="markdown-content" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.8, color: 'var(--txt-pri)', wordBreak: 'break-word' }}>
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isInline = !match && !codeString.includes('\n');

                  if (isInline) {
                    return (
                      <code style={{
                        background: 'rgba(255,255,255,0.07)', padding: '2px 6px',
                        borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace',
                        color: 'var(--accent)',
                      }} {...props}>
                        {children}
                      </code>
                    );
                  }

                  const lang = match ? match[1] : 'text';
                  const isCopied = codeCopied === codeString;

                  return (
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      {/* Code block header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.4)', padding: '6px 12px',
                        borderRadius: '8px 8px 0 0',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderBottom: 'none',
                      }}>
                        <span style={{ fontSize: 10, color: 'var(--txt-mut)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
                          {lang}
                        </span>
                        <button
                          onClick={() => handleCodeCopy(codeString)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: 'none',
                            color: isCopied ? '#6b8' : 'var(--txt-mut)',
                            fontSize: 10, cursor: 'pointer', padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          {isCopied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>

                      {/* Syntax highlighted code */}
                      <SyntaxHighlighter
                        style={oneDark}
                        language={lang}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0 0 8px 8px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                        {...props}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
