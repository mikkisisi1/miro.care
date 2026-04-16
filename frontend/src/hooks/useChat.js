import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function useChat(user, lang, refreshUser, onAIMessage) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}`);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text, id: `user_${Date.now()}` };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(`${API}/chat`, {
        message: text,
        session_id: sessionIdRef.current,
        problem: user?.selected_problem,
        language: lang,
      }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const aiMsg = {
        role: 'ai',
        content: data.message,
        id: `ai_${Date.now()}`,
        isTariffPrompt: data.needs_tariff && data.type === 'tariff_prompt',
      };

      setMessages(prev => {
        const updated = [...prev, aiMsg];
        if (!aiMsg.isTariffPrompt && onAIMessage) {
          onAIMessage(data.message, updated.length - 1);
        }
        return updated;
      });
      await refreshUser();
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
  }, [user, lang, refreshUser, onAIMessage]);

  return { messages, sendMessage, loading, sessionId: sessionIdRef.current };
}
