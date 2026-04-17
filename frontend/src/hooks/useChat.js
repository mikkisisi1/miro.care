import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

/**
 * Load the most recent chat session and its messages from the backend.
 * Returns restored message array or empty array.
 */
async function loadChatHistory(sessionIdRef) {
  const { data } = await apiClient.get('/chat/sessions');
  if (!data.sessions?.length) return [];

  const lastSession = data.sessions[0];
  sessionIdRef.current = lastSession.session_id;

  const histResp = await apiClient.get(`/chat/history/${lastSession.session_id}`);
  if (!histResp.data.messages?.length) return [];

  const restored = [];
  for (const m of histResp.data.messages) {
    if (m.user_message) restored.push({ role: 'user', content: m.user_message, id: `hist_u_${restored.length}` });
    if (m.ai_response) restored.push({ role: 'ai', content: m.ai_response, id: `hist_a_${restored.length}` });
  }
  return restored;
}

export default function useChat(user, lang, refreshUser, onAIMessage) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}`);
  const refreshUserRef = useRef(refreshUser);
  const onAIMessageRef = useRef(onAIMessage);
  refreshUserRef.current = refreshUser;
  onAIMessageRef.current = onAIMessage;

  useEffect(() => {
    if (!user || historyLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const restored = await loadChatHistory(sessionIdRef);
        if (!cancelled && restored.length > 0) setMessages(restored);
      } catch {
        if (process.env.NODE_ENV === 'development') console.error('No chat history found');
      }
      if (!cancelled) setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, historyLoaded]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: text, id: `user_${Date.now()}` }]);
    setLoading(true);

    try {
      const { data } = await apiClient.post('/chat', {
        message: text,
        session_id: sessionIdRef.current,
        problem: user?.selected_problem,
        language: lang,
      });

      const aiMsg = {
        role: 'ai',
        content: data.message,
        id: `ai_${Date.now()}`,
        isTariffPrompt: data.needs_tariff && data.type === 'tariff_prompt',
      };

      setMessages(prev => {
        const updated = [...prev, aiMsg];
        if (!aiMsg.isTariffPrompt && onAIMessageRef.current) {
          onAIMessageRef.current(data.message, updated.length - 1);
        }
        return updated;
      });
      await refreshUserRef.current();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      setMessages(prev => [...prev, {
        role: 'ai',
        content: typeof errMsg === 'string' ? errMsg : 'An error occurred. Please try again.',
        id: `err_${Date.now()}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [user?.selected_problem, lang]);

  const startNewSession = useCallback(() => {
    sessionIdRef.current = `session_${Date.now()}`;
    setMessages([]);
    setHistoryLoaded(true);
  }, []);

  return { messages, setMessages, sendMessage, loading, sessionId: sessionIdRef.current, historyLoaded, startNewSession };
}
