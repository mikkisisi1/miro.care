import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { Send, Mic, MicOff, Clock, ArrowLeft, Menu } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ChatPage() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const minutesLeft = user?.minutes_left || 0;
  const isFreePhase = (user?.free_messages_count || 0) < 12;
  const hasMinutes = minutesLeft > 0;

  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(`${API}/chat`, {
        message: text,
        session_id: sessionId,
        problem: user?.selected_problem,
        language: lang,
      }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (data.needs_tariff && data.type === 'tariff_prompt') {
        setMessages(prev => [...prev, { role: 'ai', content: data.message, isTariffPrompt: true }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      }
      await refreshUser();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      setMessages(prev => [...prev, { role: 'ai', content: typeof errMsg === 'string' ? errMsg : 'An error occurred. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user, lang, refreshUser, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es-ES' : lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'hi' ? 'hi-IN' : 'en-US';
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
    <div className="chat-page" data-testid="chat-page">
      <header className="chat-header" data-testid="chat-header">
        <button data-testid="chat-back-btn" onClick={() => navigate('/problems')} className="chat-header-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="chat-header-center">
          <span className="chat-header-title">Miro.Care</span>
          {isFreePhase ? (
            <span className="chat-header-badge chat-badge-free" data-testid="free-badge">{t('freeSession')}</span>
          ) : hasMinutes ? (
            <span className="chat-header-badge chat-badge-paid" data-testid="timer-badge">
              <Clock size={14} />
              {t('minutesLeft')}: {formatTime(minutesLeft)}
            </span>
          ) : null}
        </div>
        <button data-testid="chat-menu-btn" onClick={() => setMenuOpen(true)} className="chat-header-btn">
          <Menu size={20} />
        </button>
      </header>

      <div className="chat-messages" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-text">{t('subtitle')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`} data-testid={`chat-message-${i}`}>
            <div className="chat-bubble-content">
              {msg.content.split('\n').map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
            {msg.isTariffPrompt && (
              <button
                data-testid="go-to-tariffs-btn"
                onClick={() => navigate('/tariffs')}
                className="chat-tariff-btn"
              >
                {t('tariffs')}
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble-ai" data-testid="chat-loading">
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
