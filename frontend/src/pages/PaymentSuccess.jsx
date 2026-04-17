import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import apiClient from '@/lib/apiClient';
import { CheckCircle, Loader, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const attemptsRef = useRef(0);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (processedRef.current || cancelled) return;
      if (attemptsRef.current >= 15) {
        if (!cancelled) setStatus('timeout');
        return;
      }
      try {
        const { data } = await apiClient.get(`/payments/status/${sessionId}`);
        if (data.payment_status === 'paid') {
          processedRef.current = true;
          if (!cancelled) {
            setStatus('paid');
            await refreshUser();
          }
          return;
        }
        if (data.payment_status === 'expired' || data.status === 'expired') {
          processedRef.current = true;
          if (!cancelled) setStatus('expired');
          return;
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Payment status check:', err.message);
      }
      attemptsRef.current += 1;
      if (!cancelled) setTimeout(poll, 2000);
    };
    poll();

    return () => { cancelled = true; };
  }, [sessionId, refreshUser]);

  return (
    <div className="payment-page" data-testid="payment-success-page">
      {status === 'checking' && (
        <div className="payment-status" data-testid="payment-checking">
          <Loader size={48} className="payment-spinner" />
          <p>{t('paymentProcessing') || 'Проверяем оплату...'}</p>
        </div>
      )}
      {status === 'paid' && (
        <div className="payment-status payment-success" data-testid="payment-paid">
          <CheckCircle size={48} />
          <p>{t('paymentSuccess') || 'Оплата прошла успешно!'}</p>
          <button data-testid="go-to-chat-btn" onClick={() => navigate('/chat')} className="payment-btn">
            {t('startChat') || 'Начать общение'}
          </button>
        </div>
      )}
      {status === 'expired' && (
        <div className="payment-status" data-testid="payment-expired">
          <XCircle size={48} />
          <p>Сессия оплаты истекла. Попробуйте снова.</p>
          <button data-testid="retry-payment-btn" onClick={() => navigate('/tariffs')} className="payment-btn">
            {t('tariffs') || 'Тарифы'}
          </button>
        </div>
      )}
      {status === 'timeout' && (
        <div className="payment-status" data-testid="payment-timeout">
          <Loader size={48} />
          <p>Не удалось подтвердить оплату. Если деньги списались — не волнуйтесь, тариф активируется автоматически.</p>
          <button data-testid="go-to-chat-timeout-btn" onClick={() => navigate('/chat')} className="payment-btn">
            {t('startChat') || 'Перейти в чат'}
          </button>
        </div>
      )}
      {status === 'error' && (
        <div className="payment-status" data-testid="payment-error">
          <XCircle size={48} />
          <p>Ошибка проверки оплаты.</p>
          <button onClick={() => navigate('/tariffs')} className="payment-btn">
            {t('tariffs') || 'Тарифы'}
          </button>
        </div>
      )}
    </div>
  );
}
