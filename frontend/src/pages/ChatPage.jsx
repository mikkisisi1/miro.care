import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Mic, MicOff, ArrowLeft, Volume2, VolumeX, Clock } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';
import useAudioStream from '@/hooks/useAudioStream';
import useChat from '@/hooks/useChat';

const SPEECH_LANGS = {
  ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', es: 'es-ES',
  ar: 'ar-SA', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN',
};

export default function ChatPage() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showRunningText, setShowRunningText] = useState(false);
  const [runningText, setRunningText] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const liveTranscriptRef = useRef('');
  const messagesEndRef = useRef(null);

  const { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS } = useAudioStream(user);

  const handleAIMessage = useCallback((message, msgIndex) => {
    if (ttsEnabled) {
      setTimeout(() => playTTS(message, msgIndex), 100);
    }
  }, [ttsEnabled, playTTS]);

  const { messages, sendMessage, loading } = useChat(user, lang, refreshUser, handleAIMessage);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Handle sending
  const handleSend = (text) => {
    const msg = text || input;
    if (!msg || !msg.trim() || loading) return;
    sendMessage(msg.trim());
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle sending - stable reference for startListening
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  // Speech recognition with running text (xicon style)
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANGS[lang] || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      liveTranscriptRef.current = transcript;

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (transcript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = transcript;
        setShowRunningText(false);

        // 3s silence → show running text
        silenceTimerRef.current = setTimeout(() => {
          if (transcript && transcript.trim()) {
            setRunningText(transcript);
            setShowRunningText(true);
          }
        }, 3000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = liveTranscriptRef.current;
      if (finalText && finalText.trim()) {
        setRunningText(finalText);
        setShowRunningText(true);
        handleSendRef.current(finalText);
        // Hide running text after marquee animation
        setTimeout(() => {
          setShowRunningText(false);
          setRunningText('');
        }, 8000);
      }
      liveTranscriptRef.current = '';
      lastTranscriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onerror = () => {
      setIsListening(false);
      liveTranscriptRef.current = '';
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Badge
  const minutesLeft = user?.minutes_left || 0;
  const isFreePhase = (user?.free_messages_count || 0) < 12;
  const hasMinutes = minutesLeft > 0;

  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  return (
    <div className="xc-chat-modal" data-testid="chat-page">
      {/* Background wallpaper */}
      <div className="xc-chat-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/chat-bg.jpg)` }} />

      {/* Header */}
      <div className="xc-chat-header" data-testid="chat-header">
        <div className="xc-chat-agent-info">
          <button
            data-testid="chat-back-btn"
            onClick={() => navigate('/problems')}
            className="xc-close-btn"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="xc-chat-avatars-row">
            <div className="xc-chat-avatar-item">
              <div className="xc-chat-avatar-wrapper">
                <img src="/miron-avatar.jpg" alt="Miron" className="xc-chat-avatar-img" />
                <span className="xc-chat-online-dot" />
              </div>
              <span className="xc-avatar-name">Miron</span>
            </div>
            <div className="xc-chat-avatar-item">
              <div className="xc-chat-avatar-wrapper">
                <img src="/oksana-avatar.jpg" alt="Oksana" className="xc-chat-avatar-img" />
                <span className="xc-chat-online-dot" />
              </div>
              <span className="xc-avatar-name">Oksana</span>
            </div>
          </div>
          <div>
            <h3 className="xc-chat-agent-name">MIRO.CARE</h3>
            <p className="xc-chat-agent-status">
              {isFreePhase && t('freeSession')}
              {!isFreePhase && hasMinutes && (
                <span className="xc-timer-text">
                  <Clock size={11} strokeWidth={1.5} /> {formatTime(minutesLeft)}
                </span>
              )}
              {!isFreePhase && !hasMinutes && 'online'}
            </p>
          </div>
        </div>
        <div className="xc-header-right">
          <button
            data-testid="tts-toggle-btn"
            onClick={toggleTTS}
            className={`xc-header-icon-btn ${ttsEnabled ? 'active' : ''}`}
            title={ttsEnabled ? 'TTS On' : 'TTS Off'}
          >
            {ttsEnabled ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="xc-chat-messages" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="xc-chat-empty">
            <p>{t('subtitle')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <React.Fragment key={msg.id || `msg-${i}`}>
            <div
              className={`xc-chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              data-testid={`chat-message-${i}`}
            >
              {msg.content.split('\n').map((line, j) => (
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
              <button
                data-testid="go-to-tariffs-btn"
                onClick={() => navigate('/tariffs')}
                className="xc-tariff-btn"
              >
                {t('tariffs')}
              </button>
            )}
          </React.Fragment>
        ))}
        {loading && (
          <div className="xc-chat-message assistant typing" data-testid="chat-loading">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="xc-chat-input-area" data-testid="chat-input-form">
        {/* Mic button */}
        <button
          data-testid="mic-btn"
          onClick={handleMicClick}
          className={`xc-mic-btn ${isListening ? 'recording' : ''}`}
        >
          {isListening ? <MicOff size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
        </button>

        {/* Input container */}
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
            <input
              data-testid="chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('sendMessage')}
              className="xc-chat-text-input-inner"
              disabled={loading}
            />
          )}
        </div>

        {/* Send button */}
        {!isListening && !showRunningText && (
          <button
            data-testid="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="xc-send-btn"
          >
            <Send size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
