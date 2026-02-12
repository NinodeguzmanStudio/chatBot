// ═══════════════════════════════════════
// AIdark — Message Component
// ═══════════════════════════════════════

import React from 'react';
import type { Message } from '@/types';
import { formatTime } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className="animate-fade-up"
      style={{
        marginBottom: 24,
        animationDelay: `${index * 0.03}s`,
      }}
    >
      {/* Sender label */}
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <div
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: isUser ? 'var(--bg-hover)' : 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600,
            color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}
        >
          {isUser ? 'T' : 'A'}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)',
        }}>
          {isUser ? 'Tú' : 'AIdark'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* Content */}
      <div style={{ paddingLeft: 30 }}>
        <p style={{
          fontSize: 14, lineHeight: 1.75,
          color: isUser ? 'var(--text-secondary)' : 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </p>
      </div>
    </div>
  );
};
