import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import { AI_CHARACTERS } from '@/lib/constants';
import { formatTime } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';
import type { Message } from '@/types';

export const MessageBubble: React.FC<{ message: Message; index: number }> = ({ message, index }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const character = AI_CHARACTERS.find((c) => c.id === (message.character || 'default')) || AI_CHARACTERS[0];

  const handleCopy = () => { navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{ marginBottom: 24, animation: 'fadeUp 0.35s ease both', animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: isUser ? 'var(--bg-hover)' : 'var(--bg-el)', border: `1.5px solid ${isUser ? 'var(--border-def)' : character.color + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: isUser ? 'var(--txt-sec)' : character.color }}>
            {isUser ? 'T' : character.avatar}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isUser ? 'var(--txt-sec)' : character.color }}>{isUser ? t('chat.you') : character.name}</span>
          <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>{formatTime(message.timestamp)}</span>
        </div>
        {!isUser && (
          <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: copied ? 'rgba(100,180,100,0.12)' : 'transparent', border: 'none', color: copied ? '#6b8' : 'var(--txt-mut)', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? t('chat.copied') : t('chat.copy')}
          </button>
        )}
      </div>
      <div style={{ paddingLeft: isMobile ? 0 : 34 }}>
        {isUser ? (
          <p style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.8, color: 'var(--txt-sec)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>
        ) : (
          <div className="markdown-content" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.8, color: 'var(--txt-pri)', wordBreak: 'break-word' }}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
