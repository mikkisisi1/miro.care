import React from 'react';

export default function VoiceSelector({ onSelect, t }) {
  return (
    <div className="xc-voice-select-prompt" data-testid="voice-select-prompt">
      <div className="xc-voice-select-avatars">
        <button className="xc-voice-avatar-card" onClick={() => onSelect('male')} data-testid="voice-pick-miron">
          <div className="xc-voice-avatar-circle">
            <img src="/miron-avatar.jpg" alt="Miron" />
          </div>
          <span className="xc-voice-avatar-label">Miron</span>
        </button>
        <button className="xc-voice-avatar-card" onClick={() => onSelect('female')} data-testid="voice-pick-oksana">
          <div className="xc-voice-avatar-circle">
            <img src="/oksana-avatar.jpg" alt="Oksana" />
          </div>
          <span className="xc-voice-avatar-label">Oksana</span>
        </button>
      </div>
      <p className="xc-voice-select-hint">{t('chooseVoice') || 'Choose your consultant'}</p>
    </div>
  );
}
