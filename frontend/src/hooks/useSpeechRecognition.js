import { useState, useRef, useCallback } from 'react';

const SPEECH_LANGS = {
  ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', es: 'es-ES',
  ar: 'ar-SA', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN',
};

export default function useSpeechRecognition(lang, onFinalTranscript) {
  const [isListening, setIsListening] = useState(false);
  const [showRunningText, setShowRunningText] = useState(false);
  const [runningText, setRunningText] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const liveTranscriptRef = useRef('');
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

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
        onFinalRef.current(finalText);
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

  const toggleMic = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return { isListening, showRunningText, runningText, toggleMic };
}
