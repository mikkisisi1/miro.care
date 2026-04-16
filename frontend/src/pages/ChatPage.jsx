import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Mic, MicOff, ArrowLeft, Volume2, VolumeX, Clock, Camera, Image as ImageIcon, X } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';
import useAudioStream from '@/hooks/useAudioStream';
import useChat from '@/hooks/useChat';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SPEECH_LANGS = {
  ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', es: 'es-ES',
  ar: 'ar-SA', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN',
};

const GREETINGS = {
  male: 'Здравствуйте, я Мирон — ваш личный консультант.\nРасскажите в двух словах, что вас беспокоит, и мы вместе попробуем разобраться.\nКак мне к вам обращаться?',
  female: 'Здравствуйте, я Оксана — ваш личный консультант.\nРасскажите в двух словах, что вас беспокоит, и мы вместе попробуем разобраться.\nКак мне к вам обращаться?',
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [voiceChosen, setVoiceChosen] = useState(false);
  const [activeVoice, setActiveVoice] = useState(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const liveTranscriptRef = useRef('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const greetingCacheRef = useRef({ male: null, female: null });
  const greetingAudioRef = useRef(null);

  const { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS } = useAudioStream(user);

  const handleAIMessage = useCallback((message, msgIndex) => {
    if (ttsEnabled) {
      setTimeout(() => playTTS(message, msgIndex), 100);
    }
  }, [ttsEnabled, playTTS]);

  const { messages, sendMessage, loading, sessionId, setMessages } = useChat(user, lang, refreshUser, handleAIMessage);

  // Pre-cache greeting TTS audio for both voices
  useEffect(() => {
    if (voiceChosen) return;
    const preloadGreeting = async (voice) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API}/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ text: GREETINGS[voice], voice }),
        });
        if (response.ok) {
          const blob = await response.blob();
          greetingCacheRef.current[voice] = URL.createObjectURL(blob);
        }
      } catch (e) {
        // Cache miss is ok — will fallback to streaming
      }
    };
    preloadGreeting('male');
    preloadGreeting('female');
  }, [voiceChosen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Handle voice selection from avatar click
  const handleVoiceSelect = async (voice) => {
    if (voiceChosen) return;
    setActiveVoice(voice);
    setVoiceChosen(true);

    // Save voice to backend
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API}/user/voice`, { voice }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await refreshUser();
    } catch {
      // Silently continue — greeting still works
    }

    // Add greeting message to chat
    const greetingMsg = {
      role: 'ai',
      content: GREETINGS[voice],
      id: `greeting_${Date.now()}`,
    };
    setMessages([greetingMsg]);

    // Play cached greeting audio or fallback to streaming
    const cachedUrl = greetingCacheRef.current[voice];
    if (cachedUrl) {
      const audio = new Audio(cachedUrl);
      greetingAudioRef.current = audio;
      audio.onended = () => { greetingAudioRef.current = null; };
      audio.play().catch(() => {});
    } else if (ttsEnabled) {
      setTimeout(() => playTTS(GREETINGS[voice], 0), 100);
    }
  };

  // Handle text sending
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

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  // Speech recognition
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
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (transcript !== lastTranscriptRef.current) {
        lastTranscriptRef.current = transcript;
        setShowRunningText(false);
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
        setTimeout(() => { setShowRunningText(false); setRunningText(''); }, 8000);
      }
      liveTranscriptRef.current = '';
      lastTranscriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onerror = () => { setIsListening(false); liveTranscriptRef.current = ''; };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleMicClick = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // Image handling
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage({
          file,
          preview: event.target.result,
          base64: event.target.result.split(',')[1]
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const sendImageMessage = async () => {
    if (!selectedImage || loading) return;
    const msgId = `img_${Date.now()}`;
    setMessages(prev => [...prev, { role: 'user', content: '', id: msgId, image: selectedImage.preview }]);
    const imageBase64 = selectedImage.base64;
    setSelectedImage(null);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(`${API}/chat/image`, {
        session_id: sessionId,
        image: imageBase64,
        language: lang,
        problem: user?.selected_problem,
      }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const aiMsg = {
        role: 'ai',
        content: data.response,
        id: `ai_img_${Date.now()}`,
        isTariffPrompt: data.needs_tariff && data.type === 'tariff_prompt',
      };
      setMessages(prev => [...prev, aiMsg]);

      if (!aiMsg.isTariffPrompt && ttsEnabled) {
        const idx = messages.length + 2;
        setTimeout(() => playTTS(data.response, idx), 100);
      }
      await refreshUser();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Error analyzing image';
      setMessages(prev => [...prev, {
        role: 'ai',
        content: typeof errMsg === 'string' ? errMsg : 'Error analyzing image',
        id: `err_img_${Date.now()}`,
      }]);
    }
  };

  const minutesLeft = user?.minutes_left || 0;
  const isFreePhase = (user?.free_messages_count || 0) < 12;
  const hasMinutes = minutesLeft > 0;
  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  return (
    <div className="xc-chat-modal" data-testid="chat-page">
      <div className="xc-chat-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/chat-bg.jpg)` }} />

      {/* Header */}
      <div className="xc-chat-header" data-testid="chat-header">
        <div className="xc-chat-agent-info">
          <button data-testid="chat-back-btn" onClick={() => navigate('/problems')} className="xc-close-btn">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <div className="xc-chat-avatars-row">
            <button
              className={`xc-chat-avatar-item ${!voiceChosen ? 'xc-avatar-selectable' : ''} ${activeVoice === 'male' ? 'xc-avatar-active' : ''} ${voiceChosen && activeVoice !== 'male' ? 'xc-avatar-dim' : ''}`}
              onClick={() => handleVoiceSelect('male')}
              disabled={voiceChosen}
              data-testid="avatar-miron-btn"
            >
              <div className="xc-chat-avatar-wrapper">
                <img src="/miron-avatar.jpg" alt="Miron" className="xc-chat-avatar-img" />
                <span className="xc-chat-online-dot" />
              </div>
              <span className="xc-avatar-name">Miron</span>
            </button>
            <button
              className={`xc-chat-avatar-item ${!voiceChosen ? 'xc-avatar-selectable' : ''} ${activeVoice === 'female' ? 'xc-avatar-active' : ''} ${voiceChosen && activeVoice !== 'female' ? 'xc-avatar-dim' : ''}`}
              onClick={() => handleVoiceSelect('female')}
              disabled={voiceChosen}
              data-testid="avatar-oksana-btn"
            >
              <div className="xc-chat-avatar-wrapper">
                <img src="/oksana-avatar.jpg" alt="Oksana" className="xc-chat-avatar-img" />
                <span className="xc-chat-online-dot" />
              </div>
              <span className="xc-avatar-name">Oksana</span>
            </button>
          </div>
          <div>
            <h3 className="xc-chat-agent-name">MIRO.CARE</h3>
            <p className="xc-chat-agent-status">
              {isFreePhase && t('freeSession')}
              {!isFreePhase && hasMinutes && (
                <span className="xc-timer-text"><Clock size={11} strokeWidth={1.5} /> {formatTime(minutesLeft)}</span>
              )}
              {!isFreePhase && !hasMinutes && 'online'}
            </p>
          </div>
        </div>
        <div className="xc-header-right">
          <button data-testid="tts-toggle-btn" onClick={toggleTTS}
            className={`xc-header-icon-btn ${ttsEnabled ? 'active' : ''}`}>
            {ttsEnabled ? <Volume2 size={18} strokeWidth={1.5} /> : <VolumeX size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="xc-chat-messages" data-testid="chat-messages">
        {/* Voice selection prompt — shown before choosing */}
        {!voiceChosen && messages.length === 0 && (
          <div className="xc-voice-select-prompt" data-testid="voice-select-prompt">
            <div className="xc-voice-select-avatars">
              <button className="xc-voice-avatar-card" onClick={() => handleVoiceSelect('male')} data-testid="voice-pick-miron">
                <div className="xc-voice-avatar-circle">
                  <img src="/miron-avatar.jpg" alt="Miron" />
                </div>
                <span className="xc-voice-avatar-label">Miron</span>
              </button>
              <button className="xc-voice-avatar-card" onClick={() => handleVoiceSelect('female')} data-testid="voice-pick-oksana">
                <div className="xc-voice-avatar-circle">
                  <img src="/oksana-avatar.jpg" alt="Oksana" />
                </div>
                <span className="xc-voice-avatar-label">Oksana</span>
              </button>
            </div>
            <p className="xc-voice-select-hint">{t('chooseVoice') || 'Choose your consultant'}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <React.Fragment key={msg.id || `msg-${i}`}>
            <div className={`xc-chat-message ${msg.role === 'user' ? 'user' : 'assistant'}${msg.image ? ' has-image' : ''}`}
              data-testid={`chat-message-${i}`}>
              {msg.image && (
                <img src={msg.image} alt="Sent" className="xc-chat-message-image" />
              )}
              {msg.content && msg.content.split('\n').map((line, j) => (
                <p key={`${msg.id}-line-${j}`}>{line}</p>
              ))}
              {msg.role === 'ai' && !msg.isTariffPrompt && (
                <button data-testid={`tts-play-${i}`}
                  onClick={() => playingTTS === i ? stopTTS() : playTTS(msg.content, i)}
                  className={`xc-msg-speaker-btn ${playingTTS === i ? 'playing' : ''}`}>
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
          <div className="xc-chat-message assistant typing" data-testid="chat-loading">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className="xc-selected-image-preview">
          <img src={selectedImage.preview} alt="Selected" className="xc-preview-thumb" />
          <button className="xc-remove-image-btn" onClick={() => setSelectedImage(null)}>
            <X size={14} />
          </button>
          <button className="xc-send-image-btn" onClick={sendImageMessage} disabled={loading}
            data-testid="send-image-btn">
            <Send size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
      <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />

      {/* Input Area */}
      <div className="xc-chat-input-area" data-testid="chat-input-form">
        <button data-testid="mic-btn" onClick={handleMicClick}
          className={`xc-mic-btn ${isListening ? 'recording' : ''}`}
          disabled={!voiceChosen}>
          {isListening ? <MicOff size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
        </button>

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
              <input data-testid="chat-input" type="text" value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKeyPress}
                placeholder={t('sendMessage')} className="xc-chat-text-input-inner"
                disabled={loading || !voiceChosen} />
              <button className="xc-camera-inline-btn" data-testid="camera-inline-btn"
                onClick={() => setShowImagePicker(true)} disabled={loading || !voiceChosen}>
                <Camera size={18} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {!isListening && !showRunningText && (
          <button data-testid="send-btn" onClick={() => handleSend()}
            disabled={!input.trim() || loading || !voiceChosen} className="xc-send-btn">
            <Send size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="xc-image-picker-overlay" onClick={() => setShowImagePicker(false)}>
          <div className="xc-image-picker-modal" onClick={e => e.stopPropagation()}>
            <button className="xc-image-picker-option" data-testid="camera-option-btn"
              onClick={() => { setShowImagePicker(false); cameraInputRef.current?.click(); }}>
              <Camera size={20} strokeWidth={1.5} />
              {t('camera') || 'Camera'}
            </button>
            <button className="xc-image-picker-option" data-testid="gallery-option-btn"
              onClick={() => { setShowImagePicker(false); fileInputRef.current?.click(); }}>
              <ImageIcon size={20} strokeWidth={1.5} />
              {t('gallery') || 'Gallery'}
            </button>
          </div>
        </div>
      )}

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
