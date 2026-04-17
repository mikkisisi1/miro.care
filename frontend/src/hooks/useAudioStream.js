import { useState, useRef, useCallback } from 'react';
import { API_BASE, getAuthToken } from '@/lib/apiClient';

/**
 * Append a chunk to a MediaSource SourceBuffer, waiting if it's currently updating.
 */
async function appendChunk(sourceBuffer, chunk) {
  if (sourceBuffer.updating) {
    await new Promise(r => sourceBuffer.addEventListener('updateend', r, { once: true }));
  }
  sourceBuffer.appendBuffer(chunk);
}

/**
 * Pump the ReadableStream reader into a MediaSource SourceBuffer.
 */
async function pumpStream(reader, sourceBuffer, mediaSource) {
  const { done, value } = await reader.read();
  if (done) {
    if (mediaSource.readyState === 'open') {
      sourceBuffer.addEventListener('updateend', () => {
        if (mediaSource.readyState === 'open') mediaSource.endOfStream();
      }, { once: true });
    }
    return;
  }
  await appendChunk(sourceBuffer, value);
  sourceBuffer.addEventListener('updateend', () => pumpStream(reader, sourceBuffer, mediaSource), { once: true });
}

/**
 * Fetch TTS audio as a stream and play it via MediaSource.
 * Returns the Audio element for external control.
 */
async function fetchAndStreamTTS(text, voice, onEnd) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) throw new Error('TTS failed');

  const mediaSource = new MediaSource();
  const audioUrl = URL.createObjectURL(mediaSource);
  const audio = new Audio(audioUrl);

  const cleanup = () => { URL.revokeObjectURL(audioUrl); };
  audio.onended = () => { onEnd(); cleanup(); };
  audio.onerror = () => { onEnd(); cleanup(); };

  mediaSource.addEventListener('sourceopen', async () => {
    try {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      const reader = response.body.getReader();
      await pumpStream(reader, sourceBuffer, mediaSource);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('MediaSource streaming error:', err.message);
    }
  });

  audio.play().catch(() => {});
  return audio;
}

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
      const audio = await fetchAndStreamTTS(
        text,
        user?.selected_voice || 'male',
        () => setPlayingTTS(null),
      );
      audioRef.current = audio;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('TTS playback error:', err.message);
      setPlayingTTS(null);
    }
  }, [ttsEnabled, user?.selected_voice, stopTTS]);

  return { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS };
}
