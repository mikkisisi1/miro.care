import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Mic, MicOff, Clock, ArrowLeft, Menu, Volume2, VolumeX } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';
import useAudioStream from '@/hooks/useAudioStream';
import useChat from '@/hooks/useChat';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SPEECH_LANGS = {
  ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', es: 'es-ES',
  ar: 'ar-SA', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN',
};

function ChatHeader({ user, t, onBack, onMenuOpen, ttsEnabled, toggleTTS }) {
  const minutesLeft = user?.minutes_left || 0;
  const isFreePhase = (user?.free_messages_count || 0) < 12;
  const hasMinutes = minutesLeft > 0;

  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  const renderBadge = () => {
    if (isFreePhase) {
      return <span className="chat-header-badge chat-badge-free" data-testid="free-badge">{t('freeSession')}</span>;
    }
    if (hasMinutes) {
      return (
        <span className="chat-header-badge chat-badge-paid" data-testid="timer-badge">
          <Clock size={14} />
          {t('minutesLeft')}: {formatTime(minutesLeft)}
        </span>
      );
    }
    return null;
  };

  return (
    <header className="chat-header" data-testid="chat-header">
      <button data-testid="chat-back-btn" onClick={onBack} className="chat-header-btn">
        <ArrowLeft size={20} />
      </button>
      <div className="chat-header-center">
        <span className="chat-header-title">Miro.Care</span>
        {renderBadge()}
      </div>
      <button data-testid="chat-menu-btn" onClick={onMenuOpen} className="chat-header-btn">
        <Menu size={20} />
      </button>
      <button
        data-testid="tts-toggle-btn"
        onClick={toggleTTS}
        className={`chat-header-btn ${ttsEnabled ? 'tts-active' : ''}`}
        title={ttsEnabled ? 'TTS On' : 'TTS Off'}
      >
        {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </header>
  );
}

function MessageList({ messages, loading, playingTTS, playTTS, stopTTS, onGoToTariffs, t }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-messages" data-testid="chat-messages">
      {messages.length === 0 && (
        <div className="chat-empty">
          <p className="chat-empty-text">{t('subtitle')}</p>
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={msg.id || `msg-${i}`} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`} data-testid={`chat-message-${i}`}>
          <div className="chat-bubble-content">
            {msg.content.split('\n').map((line, j) => (
              <p key={`${msg.id}-line-${j}`}>{line}</p>
            ))}
          </div>
          {msg.role === 'ai' && !msg.isTariffPrompt && (
            <button
              data-testid={`tts-play-${i}`}
              onClick={() => playingTTS === i ? stopTTS() : playTTS(msg.content, i)}
              className={`chat-tts-btn ${playingTTS === i ? 'chat-tts-playing' : ''}`}
            >
              {playingTTS === i ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
          {msg.isTariffPrompt && (
            <button data-testid="go-to-tariffs-btn" onClick={onGoToTariffs} className="chat-tariff-btn">
              {t('tariffs')}
            </button>
          )}
        </div>
      ))}
      {loading && (
        <div className="chat-bubble chat-bubble-ai" data-testid="chat-loading">
          <div className="chat-typing"><span /><span /><span /></div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

function ChatInputArea({ onSubmit, loading, lang, t }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input);
    setInput('');
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANGS[lang] || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-form" data-testid="chat-input-form">
      <button
        type="button"
        data-testid="mic-btn"
        onClick={toggleRecording}
        className={`chat-mic-btn ${isRecording ? 'chat-mic-active' : ''}`}
      >
        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
      </button>
      <input
        data-testid="chat-input"
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t('sendMessage')}
        className="chat-text-input"
        disabled={loading}
      />
      <button data-testid="send-btn" type="submit" disabled={!input.trim() || loading} className="chat-send-btn">
        <Send size={20} />
      </button>
    </form>
  );
}

export default function ChatPage() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS } = useAudioStream(user);

  const handleAIMessage = useCallback((message, msgIndex) => {
    if (ttsEnabled) {
      setTimeout(() => playTTS(message, msgIndex), 100);
    }
  }, [ttsEnabled, playTTS]);

  const { messages, sendMessage, loading } = useChat(user, lang, refreshUser, handleAIMessage);

  return (
    <div className="chat-page" data-testid="chat-page">
      <ChatHeader
        user={user}
        t={t}
        onBack={() => navigate('/problems')}
        onMenuOpen={() => setMenuOpen(true)}
        ttsEnabled={ttsEnabled}
        toggleTTS={toggleTTS}
      />
      <MessageList
        messages={messages}
        loading={loading}
        playingTTS={playingTTS}
        playTTS={playTTS}
        stopTTS={stopTTS}
        onGoToTariffs={() => navigate('/tariffs')}
        t={t}
      />
      <ChatInputArea
        onSubmit={sendMessage}
        loading={loading}
        lang={lang}
        t={t}
      />
      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
