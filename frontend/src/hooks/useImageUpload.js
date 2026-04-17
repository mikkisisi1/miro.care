import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function useImageUpload({ sessionId, lang, user, messages, setMessages, refreshUser, ttsEnabled, playTTS, loading }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage({
          file,
          preview: event.target.result,
          base64: event.target.result.split(',')[1],
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const sendImageMessage = useCallback(async () => {
    if (!selectedImage || loading) return;
    const msgId = `img_${Date.now()}`;
    setMessages(prev => [...prev, { role: 'user', content: '', id: msgId, image: selectedImage.preview }]);
    const imageBase64 = selectedImage.base64;
    setSelectedImage(null);

    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(`${API}/chat/image`, {
        session_id: sessionId,
        image: imageBase64,
        language: lang,
        problem: user?.selected_problem,
      }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const aiMsg = {
        role: 'ai',
        content: data.response,
        id: `ai_img_${Date.now()}`,
        isTariffPrompt: data.needs_tariff && data.type === 'tariff_prompt',
      };
      setMessages(prev => [...prev, aiMsg]);

      if (!aiMsg.isTariffPrompt && ttsEnabled) {
        const idx = messages.length + 2;
        setTimeout(() => playTTS(data.response, idx), 100);
      }
      await refreshUser();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Error analyzing image';
      setMessages(prev => [...prev, {
        role: 'ai',
        content: typeof errMsg === 'string' ? errMsg : 'Error analyzing image',
        id: `err_img_${Date.now()}`,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- API, axios are module-level constants
  }, [selectedImage, loading, sessionId, lang, user, messages, setMessages, refreshUser, ttsEnabled, playTTS]);

  return { selectedImage, setSelectedImage, handleImageSelect, sendImageMessage };
}
