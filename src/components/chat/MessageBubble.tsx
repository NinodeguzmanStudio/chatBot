// ═══════════════════════════════════════
// AIdark — Message Bubble v3 (with Copy)
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import type { Message } from '@/types';
import { formatTime } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease both', animationDelay: `${index * 0.04}s` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: isUser ? 'var(--bg-hover)' : 'var(--bg-el)',
            border: '1px solid var(--border-def)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600,
            color: isUser ? 'var(--txt-sec)' : 'var(--txt-pri)',
          }}>
            {isUser ? 'T' : 'A'}
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: isUser ? 'var(--txt-sec)' : 'var(--txt-pri)',
          }}>
            {isUser ? 'Tú' : 'AIdark'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Copy button for AI messages */}
        {!isUser && (
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4,
              background: copied ? 'rgba(100,180,100,0.12)' : 'transparent',
              border: '1px solid transparent',
              color: copied ? '#6b8' : 'var(--txt-mut)',
              fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Copy size={12} /> {copied ? 'Copiado' : 'Copiar'}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ paddingLeft: 32 }}>
        <p style={{
          fontSize: 14, lineHeight: 1.8,
          color: isUser ? 'var(--txt-sec)' : 'var(--txt-pri)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {message.content}
        </p>
      </div>
    </div>
  );
};
