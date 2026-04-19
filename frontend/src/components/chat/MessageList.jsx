import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MessageList({ messages, loading, playingTTS, playTTS, stopTTS, messagesEndRef, activeVoice }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const typingLabel = activeVoice === 'female' ? t('typingOksana') : t('typingMiron');
  const typingAvatar = activeVoice === 'female' ? '/oksana-avatar.jpg' : '/miron-avatar.jpg';

  return (
    <>
      {messages.map((msg, i) => (
        <React.Fragment key={msg.id || `msg-${i}`}>
          <div
            className={`xc-chat-message ${msg.role === 'user' ? 'user' : 'assistant'}${msg.image ? ' has-image' : ''}`}
            data-testid={`chat-message-${i}`}
          >
            {msg.image && (
              <img src={msg.image} alt="Sent" className="xc-chat-message-image" />
            )}
            {msg.content && msg.content.split('\n').map((line, j) => (
              <p key={`${msg.id}-line-${j}`}>{line}</p>
            ))}
            {msg.role === 'ai' && !msg.isTariffPrompt && (
              <button
                data-testid={`tts-play-${i}`}
                onClick={() => playingTTS === i ? stopTTS() : playTTS(msg.content, i)}
                className={`xc-msg-speaker-btn ${playingTTS === i ? 'playing' : ''}`}
              >
                {playingTTS === i ? <VolumeX size={14} strokeWidth={1.5} /> : <Volume2 size={14} strokeWidth={1.5} />}
              </button>
            )}
          </div>
          {msg.isTariffPrompt && (
            <button data-testid="go-to-tariffs-btn" onClick={() => navigate('/tariffs')} className="xc-tariff-btn">
              {t('tariffs')}
            </button>
          )}
        </React.Fragment>
      ))}
      {loading && (
        <div className="xc-typing-wrap" data-testid="chat-loading">
          <img src={typingAvatar} alt="" className="xc-typing-avatar" />
          <div className="xc-chat-message assistant typing">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
          <span className="xc-typing-label" data-testid="typing-label">{typingLabel}…</span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );
}
