import { useState, useRef, useCallback } from 'react';
import { API_BASE, getToken } from '@/lib/apiClient';

export default function useAudioStream(user, audioElementRef) {
  const [playingTTS, setPlayingTTS] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const cancelledRef = useRef(false);

  const stopTTS = useCallback(() => {
    cancelledRef.current = true;
    if (audioElementRef?.current) {
      audioElementRef.current.pause();
      audioElementRef.current.removeAttribute('src');
      audioElementRef.current.load();
    }
    setPlayingTTS(null);
  }, [audioElementRef]);

  const toggleTTS = useCallback(() => {
    setTtsEnabled(prev => {
      if (prev) stopTTS();
      return !prev;
    });
  }, [stopTTS]);

  const playTTS = useCallback(async (text, msgIndex, voiceOverride) => {
    if (!ttsEnabled || !audioElementRef?.current) return;
    stopTTS();
    cancelledRef.current = false;
    setPlayingTTS(msgIndex);

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voice: voiceOverride || user?.selected_voice || 'male' }),
      });

      if (!response.ok || cancelledRef.current) {
        if (!cancelledRef.current) setPlayingTTS(null);
        return;
      }

      const blob = await response.blob();
      if (cancelledRef.current) return;

      const audioUrl = URL.createObjectURL(blob);
      const audio = audioElementRef.current;

      audio.onended = () => {
        setPlayingTTS(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingTTS(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.src = audioUrl;
      await audio.play();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('TTS playback error:', err.message);
      if (!cancelledRef.current) setPlayingTTS(null);
    }
  }, [ttsEnabled, user?.selected_voice, stopTTS, audioElementRef]);

  return { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS };
}
