import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BurgerMenu from '@/components/BurgerMenu';
import ChatHeader from '@/components/chat/ChatHeader';
import VoiceSelector from '@/components/chat/VoiceSelector';
import MessageList from '@/components/chat/MessageList';
import ChatInputArea from '@/components/chat/ChatInputArea';
import ImagePreview from '@/components/chat/ImagePreview';
import ImagePickerModal from '@/components/chat/ImagePickerModal';
import useAudioStream from '@/hooks/useAudioStream';
import useChat from '@/hooks/useChat';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import useImageUpload from '@/hooks/useImageUpload';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
      } catch (err) {
        console.error('TTS greeting cache miss:', err.message);
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
      const token = localStorage.getItem('access_token');
      await axios.put(`${API}/user/voice`, { voice }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await refreshUser();
    } catch (err) {
      console.error('Voice save failed:', err.message);
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
  const formatTime = (mins) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  return (
    <div className="xc-chat-modal" data-testid="chat-page">
      <div className="xc-chat-bg" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/chat-bg.jpg)` }} />

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
        freeSessionLabel={t('freeSession')}
      />

      <div className="xc-chat-messages" data-testid="chat-messages">
        {!voiceChosen && messages.length === 0 && (
          <VoiceSelector onSelect={handleVoiceSelect} t={t} />
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
