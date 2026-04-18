import { useState, useRef, useCallback } from 'react';
import { API_BASE, getToken } from '@/lib/apiClient';

/**
 * TTS playback hook with true streaming via MediaSource Extensions.
 * Audio starts playing as soon as the first MP3 chunk arrives from backend
 * (~300ms TTFB with Fish Audio `latency=balanced`).
 *
 * Fallback: if MediaSource or `audio/mpeg` is not supported (some iOS Safari),
 * we buffer into a Blob and play normally.
 */
export default function useAudioStream(user, audioElementRef) {
  const [playingTTS, setPlayingTTS] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const cancelledRef = useRef(false);
  const abortRef = useRef(null);
  const currentUrlRef = useRef(null);

  const stopTTS = useCallback(() => {
    cancelledRef.current = true;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
    if (audioElementRef?.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.removeAttribute('src');
        audioElementRef.current.load();
      } catch {}
    }
    if (currentUrlRef.current) {
      try { URL.revokeObjectURL(currentUrlRef.current); } catch {}
      currentUrlRef.current = null;
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

    const token = getToken();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voice: voiceOverride || user?.selected_voice || 'male' }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body || cancelledRef.current) {
        if (!cancelledRef.current) setPlayingTTS(null);
        return;
      }

      const audio = audioElementRef.current;
      const mime = 'audio/mpeg';
      const mseSupported =
        typeof window !== 'undefined' &&
        'MediaSource' in window &&
        window.MediaSource.isTypeSupported(mime);

      if (mseSupported) {
        // -------- STREAMING path (Chrome, Firefox, Edge, Android) --------
        const mediaSource = new MediaSource();
        const url = URL.createObjectURL(mediaSource);
        currentUrlRef.current = url;

        audio.onended = () => {
          setPlayingTTS(null);
          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
            currentUrlRef.current = null;
          }
        };
        audio.onerror = () => {
          setPlayingTTS(null);
          if (currentUrlRef.current) {
            URL.revokeObjectURL(currentUrlRef.current);
            currentUrlRef.current = null;
          }
        };

        audio.src = url;

        await new Promise((resolve) => {
          mediaSource.addEventListener('sourceopen', resolve, { once: true });
        });

        if (cancelledRef.current) return;

        let sourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer(mime);
        } catch (e) {
          // Fallback to blob path if MSE rejects (rare)
          if (process.env.NODE_ENV === 'development') console.warn('MSE addSourceBuffer failed, fallback to blob:', e?.message);
          return playViaBlob(response, audio);
        }

        const reader = response.body.getReader();
        const pendingChunks = [];
        let readerDone = false;
        let playbackStarted = false;

        const appendNext = () => {
          if (cancelledRef.current) return;
          if (sourceBuffer.updating) return;
          if (pendingChunks.length > 0) {
            try { sourceBuffer.appendBuffer(pendingChunks.shift()); } catch {}
          } else if (readerDone) {
            try { mediaSource.endOfStream(); } catch {}
          }
        };

        sourceBuffer.addEventListener('updateend', () => {
          // Start playback as soon as first chunk is decoded
          if (!playbackStarted) {
            playbackStarted = true;
            audio.play().catch(() => { /* autoplay issues handled by caller */ });
          }
          appendNext();
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (cancelledRef.current) {
              try { reader.cancel(); } catch {}
              return;
            }
            if (done) {
              readerDone = true;
              appendNext();
              break;
            }
            if (value && value.length) {
              pendingChunks.push(value);
              appendNext();
            }
          }
        } catch (streamErr) {
          if (streamErr?.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
            console.warn('TTS stream read error:', streamErr.message);
          }
        }
      } else {
        // -------- Fallback: Safari / unsupported → buffer to blob --------
        await playViaBlob(response, audio);
      }
    } catch (err) {
      if (err?.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error('TTS playback error:', err.message);
      }
      if (!cancelledRef.current) setPlayingTTS(null);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }

    async function playViaBlob(resp, audio) {
      const blob = await resp.blob();
      if (cancelledRef.current) return;
      const audioUrl = URL.createObjectURL(blob);
      currentUrlRef.current = audioUrl;

      audio.onended = () => {
        setPlayingTTS(null);
        URL.revokeObjectURL(audioUrl);
        if (currentUrlRef.current === audioUrl) currentUrlRef.current = null;
      };
      audio.onerror = () => {
        setPlayingTTS(null);
        URL.revokeObjectURL(audioUrl);
        if (currentUrlRef.current === audioUrl) currentUrlRef.current = null;
      };

      audio.src = audioUrl;
      await audio.play();
    }
  }, [ttsEnabled, user?.selected_voice, stopTTS, audioElementRef]);

  return { playTTS, stopTTS, playingTTS, ttsEnabled, toggleTTS };
}
