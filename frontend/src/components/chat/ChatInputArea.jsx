import React from 'react';
import { Send, Mic, Camera } from 'lucide-react';

export default function ChatInputArea({
  input, setInput, loading, voiceChosen,
  isListening, isSupported, showRunningText, runningText,
  onSend, onMicClick, onCameraClick, onKeyDown, placeholder,
}) {
  return (
    <div className="xc-chat-input-area" data-testid="chat-input-form">
      <div className="xc-input-container">
        {showRunningText && runningText ? (
          <span className="xc-running-text-inner">{runningText}</span>
        ) : isListening ? (
          <div className="xc-wave-inner">
            <svg viewBox="0 0 320 30" preserveAspectRatio="none">
              <path className="xc-wave-path-1" d="M0,15 Q20,5 40,15 Q60,25 80,15 Q100,5 120,15 Q140,25 160,15 Q180,5 200,15 Q220,25 240,15 Q260,5 280,15 Q300,25 320,15" />
              <path className="xc-wave-path-2" d="M0,15 Q20,25 40,15 Q60,5 80,15 Q100,25 120,15 Q140,5 160,15 Q180,25 200,15 Q220,5 240,15 Q260,25 280,15 Q300,5 320,15" />
            </svg>
          </div>
        ) : (
          <>
            <input
              data-testid="chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder || '...'}
              className="xc-chat-text-input-inner"
              disabled={loading}
            />
            {!isListening && !showRunningText && (
              <button
                className="xc-camera-inline-btn"
                data-testid="camera-inline-btn"
                onClick={onCameraClick}
                disabled={loading}
              >
                <Camera size={19} strokeWidth={1.5} />
              </button>
            )}
          </>
        )}
      </div>

      {!isListening && !showRunningText && (
        <button
          data-testid="send-btn"
          onClick={() => onSend()}
          disabled={!input.trim() || loading}
          className="xc-send-btn"
        >
          <Send size={16} strokeWidth={1.5} />
        </button>
      )}

      <button
        data-testid="mic-btn"
        className={`xc-mic-btn ${isListening ? 'recording' : ''}`}
        onClick={onMicClick}
        disabled={loading || !isSupported}
        aria-label={isListening ? "Stop recording" : "Start recording"}
        title={!isSupported ? "Браузер не поддерживает распознавание речи" : ""}
      >
        <Mic size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}
