import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function useChat(user, lang, refreshUser, onAIMessage) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}`);

  // Load last session's history on mount
  useEffect(() => {
    if (!user || historyLoaded) return;
    const loadHistory = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const { data } = await axios.get(`${API}/chat/sessions`, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (data.sessions && data.sessions.length > 0) {
          const lastSession = data.sessions[0];
          sessionIdRef.current = lastSession.session_id;
          const histResp = await axios.get(`${API}/chat/history/${lastSession.session_id}`, {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (histResp.data.messages && histResp.data.messages.length > 0) {
            const restored = [];
            for (const m of histResp.data.messages) {
              if (m.user_message) {
                restored.push({ role: 'user', content: m.user_message, id: `hist_u_${restored.length}` });
              }
              if (m.ai_response) {
                restored.push({ role: 'ai', content: m.ai_response, id: `hist_a_${restored.length}` });
              }
            }
            if (restored.length > 0) {
              setMessages(restored);
            }
          }
        }
      } catch {
        // No history — fresh session
      }
      setHistoryLoaded(true);
    };
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- API, axios are module-level constants
  }, [user, lang, refreshUser, onAIMessage]);

  const startNewSession = useCallback(() => {
    sessionIdRef.current = `session_${Date.now()}`;
    setMessages([]);
    setHistoryLoaded(true);
  }, []);

  return { messages, setMessages, sendMessage, loading, sessionId: sessionIdRef.current, historyLoaded, startNewSession };
}
