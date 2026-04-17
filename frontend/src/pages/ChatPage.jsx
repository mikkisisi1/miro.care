import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BurgerMenu from '@/components/BurgerMenu';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import ChatInputArea from '@/components/chat/ChatInputArea';
import ImagePreview from '@/components/chat/ImagePreview';
import ImagePickerModal from '@/components/chat/ImagePickerModal';
import useAudioStream from '@/hooks/useAudioStream';
import useChat from '@/hooks/useChat';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useImageUpload from '@/hooks/useImageUpload';
import useCountdown from '@/hooks/useCountdown';
import apiClient, { API_BASE, getAuthToken } from '@/lib/apiClient';

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
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [voiceChosen, setVoiceChosen] = useState(false);
  const [activeVoice, setActiveVoice] = useState(null);
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

  const { messages, sendMessage, loading, sessionId, setMessages, historyLoaded } = useChat(user, lang, refreshUser, handleAIMessage);

  // If history loaded with messages, skip voice selection
  useEffect(() => {
    if (historyLoaded && messages.length > 0 && !voiceChosen) {
      setVoiceChosen(true);
      setActiveVoice(user?.selected_voice || 'male');
    }
  }, [historyLoaded, messages.length, voiceChosen, user?.selected_voice]);

  // Pre-cache greeting TTS audio for both voices
  useEffect(() => {
    if (voiceChosen) return;
    const preloadGreeting = async (voice) => {
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/tts`, {
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
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('TTS greeting cache miss:', err.message);
      }
    };
    preloadGreeting('male');
    preloadGreeting('female');
  }, [voiceChosen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Voice selection handler
  const handleVoiceSelect = async (voice) => {
    if (voiceChosen) return;
    setActiveVoice(voice);
    setVoiceChosen(true);

    try {
      await apiClient.put('/user/voice', { voice });
      await refreshUser();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Voice save failed:', err.message);
    }

    setMessages([{
      role: 'ai',
      content: GREETINGS[voice],
      id: `greeting_${Date.now()}`,
    }]);

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

  // Text sending
  const handleSend = useCallback((text) => {
    const msg = text || input;
    if (!msg || !msg.trim() || loading) return;
    sendMessage(msg.trim());
    setInput('');
  }, [input, loading, sendMessage]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Speech recognition
  const { isListening, showRunningText, runningText, toggleMic } = useSpeechRecognition(lang, handleSend);

  // Image upload
  const { selectedImage, setSelectedImage, handleImageSelect, sendImageMessage } = useImageUpload({
    sessionId, lang, user, messages, setMessages, refreshUser, ttsEnabled, playTTS, loading,
  });

  const minutesLeft = user?.minutes_left || 0;
  const isFreePhase = (user?.free_messages_count || 0) < 12;
  const hasMinutes = minutesLeft > 0;
  const countdownSeconds = useCountdown(minutesLeft, hasMinutes, isFreePhase);
  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 769;
  const chatBg = isDesktop
    ? `${process.env.PUBLIC_URL}/chat-bg-desktop.jpg`
    : `${process.env.PUBLIC_URL}/chat-bg.jpg`;

  return (
    <div className="xc-chat-modal" data-testid="chat-page">
      <div className="xc-chat-bg" style={{ backgroundImage: `url(${chatBg})` }} />

      <ChatHeader
        voiceChosen={voiceChosen}
        activeVoice={activeVoice}
        onVoiceSelect={handleVoiceSelect}
        ttsEnabled={ttsEnabled}
        toggleTTS={toggleTTS}
        isFreePhase={isFreePhase}
        hasMinutes={hasMinutes}
        minutesLeft={minutesLeft}
        formatTime={formatTime}
        onBack={() => navigate('/problems')}
        onMenuOpen={() => setMenuOpen(true)}
        freeSessionLabel={t('freeSession')}
        countdownSeconds={countdownSeconds}
      />

      <div className="xc-chat-body">
        <div className="xc-chat-messages" data-testid="chat-messages">
          {!voiceChosen && messages.length === 0 && (
            <div className="xc-voice-hint" data-testid="voice-hint">
              <p>{t('chooseVoice')}</p>
            </div>
          )}
          <MessageList
            messages={messages}
            loading={loading}
            playingTTS={playingTTS}
            playTTS={playTTS}
            stopTTS={stopTTS}
            messagesEndRef={messagesEndRef}
          />
        </div>

        <ImagePreview
          selectedImage={selectedImage}
          onRemove={() => setSelectedImage(null)}
          onSend={sendImageMessage}
          loading={loading}
        />

        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
        <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageSelect} style={{ display: 'none' }} />

        <ChatInputArea
          input={input}
          setInput={setInput}
          loading={loading}
          voiceChosen={voiceChosen}
          isListening={isListening}
          showRunningText={showRunningText}
          runningText={runningText}
          onSend={handleSend}
          onMicClick={toggleMic}
          onCameraClick={() => setShowImagePicker(true)}
          onKeyDown={handleKeyPress}
          placeholder={t('sendMessage')}
        />
      </div>

      {showImagePicker && (
        <ImagePickerModal
          onClose={() => setShowImagePicker(false)}
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => fileInputRef.current?.click()}
        />
      )}

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
