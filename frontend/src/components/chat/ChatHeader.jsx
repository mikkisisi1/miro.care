import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Menu } from 'lucide-react';

export default function ChatHeader({
  voiceChosen, activeVoice, onVoiceSelect,
  ttsEnabled, toggleTTS,
  isFreePhase, hasMinutes, minutesLeft, formatTime,
  onBack, freeSessionLabel, countdownSeconds,
  onMenuOpen, isBusy,
}) {
  const showCountdown = countdownSeconds !== null && countdownSeconds >= 0;

  return (
    <div className="xc-chat-header" data-testid="chat-header">
      <div className="xc-chat-agent-info">
        <button data-testid="chat-back-btn" onClick={onBack} className="xc-close-btn">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="xc-chat-avatars-row">
          <button
            className={`xc-chat-avatar-item ${!voiceChosen ? 'xc-avatar-selectable' : ''} ${activeVoice === 'male' ? 'xc-avatar-active' : ''} ${voiceChosen && activeVoice !== 'male' ? 'xc-avatar-dim' : ''}`}
            onClick={() => onVoiceSelect('male')}
            data-testid="avatar-miron-btn"
          >
            <div className="xc-chat-avatar-wrapper">
              <img src="/miron-avatar.jpg" alt="Miron" className="xc-chat-avatar-img" />
              {activeVoice === 'male' && isBusy && <span className="xc-chat-thinking-dot" data-testid="thinking-dot-miron" />}
            </div>
            <span className="xc-avatar-name">Miron</span>
          </button>
          <button
            className={`xc-chat-avatar-item ${!voiceChosen ? 'xc-avatar-selectable' : ''} ${activeVoice === 'female' ? 'xc-avatar-active' : ''} ${voiceChosen && activeVoice !== 'female' ? 'xc-avatar-dim' : ''}`}
            onClick={() => onVoiceSelect('female')}
            data-testid="avatar-oksana-btn"
          >
            <div className="xc-chat-avatar-wrapper">
              <img src="/oksana-avatar.jpg" alt="Oksana" className="xc-chat-avatar-img" />
              {activeVoice === 'female' && isBusy && <span className="xc-chat-thinking-dot" data-testid="thinking-dot-oksana" />}
            </div>
            <span className="xc-avatar-name">Oksana</span>
          </button>
        </div>
      </div>
      <div className="xc-header-right">
        {showCountdown && (
          <span className="xc-countdown" data-testid="countdown-timer">
            {countdownSeconds}
          </span>
        )}
        <button
          data-testid="tts-toggle-btn"
          onClick={toggleTTS}
          className={`xc-header-icon-btn ${ttsEnabled ? 'active' : ''}`}
        >
          {ttsEnabled ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
        </button>
        <button
          data-testid="chat-menu-btn"
          onClick={onMenuOpen}
          className="xc-header-icon-btn"
        >
          <Menu size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
