import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { CheckCircle, Loader } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async () => {
      if (attemptsRef.current >= 10) {
        if (!cancelled) setStatus('timeout');
        return;
      }
      try {
        const token = localStorage.getItem('access_token');
        const { data } = await axios.get(`${API}/payments/status/${sessionId}`, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (data.payment_status === 'paid') {
          if (!cancelled) {
            setStatus('paid');
            await refreshUser();
          }
          return;
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Payment status check failed:', err.message);
      }
      attemptsRef.current += 1;
      if (!cancelled) setTimeout(poll, 2000);
    };
    poll();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- API, axios, attemptsRef are stable
  }, [sessionId, refreshUser]);

  return (
    <div className="payment-page" data-testid="payment-success-page">
      {status === 'checking' && (
        <div className="payment-status">
          <Loader size={48} className="payment-spinner" />
          <p>{t('paymentProcessing')}</p>
        </div>
      )}
      {status === 'paid' && (
        <div className="payment-status payment-success">
          <CheckCircle size={48} />
          <p>{t('paymentSuccess')}</p>
          <button data-testid="go-to-chat-btn" onClick={() => navigate('/chat')} className="payment-btn">
            {t('startChat')}
          </button>
        </div>
      )}
      {status === 'timeout' && (
        <div className="payment-status">
          <p>Payment verification timed out. Please try again.</p>
          <button onClick={() => navigate('/tariffs')} className="payment-btn">{t('tariffs')}</button>
        </div>
      )}
    </div>
  );
}
