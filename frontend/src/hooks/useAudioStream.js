import { useState, useRef, useCallback } from 'react';
import { API_BASE } from '@/lib/apiClient';

export default function useAudioStream(user) {
  const [playingTTS, setPlayingTTS] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const audioRef = useRef(null);

  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingTTS(null);
  }, []);

  const toggleTTS = useCallback(() => {
    setTtsEnabled(prev => {
      if (prev) stopTTS();
      return !prev;
    });
  }, [stopTTS]);

  const playTTS = useCallback(async (text, msgIndex) => {
    if (!ttsEnabled) return;
    stopTTS();
    setPlayingTTS(msgIndex);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ text, voice: user?.selected_voice || 'male' }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          const reader = response.body.getReader();

          const pump = async () => {
            const { done, value } = await reader.read();
            if (done) {
              if (mediaSource.readyState === 'open') {
                sourceBuffer.addEventListener('updateend', () => {
                  if (mediaSource.readyState === 'open') mediaSource.endOfStream();
                }, { once: true });
              }
              return;
            }
            if (sourceBuffer.updating) {
              await new Promise(r => sourceBuffer.addEventListener('updateend', r, { once: true }));
            }
            sourceBuffer.appendBuffer(value);
            sourceBuffer.addEventListener('updateend', pump, { once: true });
          };
          pump();
        } catch (err) {
          if (process.env.NODE_ENV === 'development') console.error('MediaSource streaming error:', err.message);
        }
      });

      audio.onended = () => { setPlayingTTS(null); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setPlayingTTS(null); URL.revokeObjectURL(audioUrl); };
      audio.play().catch(() => {});
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('TTS playback error:', err.message);
      setPlayingTTS(null);
    }
  }, [ttsEnabled, user?.selected_voice, stopTTS]);

  return { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS };
}
