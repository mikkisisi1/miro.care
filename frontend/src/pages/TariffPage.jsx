import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import axios from 'axios';
import { Clock, Zap, Calendar, Moon, Gift } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TARIFF_ICONS = { test: Gift, hour: Zap, week: Calendar, month: Moon };

export default function TariffPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const tariffs = [
    { id: 'test', name: t('testFree'), minutes: 3, price: 0, label: '3 ' + t('min'), disabled: user?.test_used },
    { id: 'hour', name: '1 ' + t('hours'), minutes: 60, price: 3, label: '1 ' + t('hours') },
    { id: 'week', name: '7 ' + t('hours'), minutes: 420, price: 14, label: '7 ' + t('hours'), recommended: true },
    { id: 'month', name: '30 ' + t('hours'), minutes: 1800, price: 29, label: '30 ' + t('hours') },
  ];

  const handleSelect = async (tariffId) => {
    try {
      const token = localStorage.getItem('access_token');
      const { data } = await axios.post(`${API}/payments/create-checkout`, {
        tariff_id: tariffId,
        origin_url: window.location.origin,
      }, {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (data.type === 'test_activated') {
        await refreshUser();
        navigate('/chat');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="tariff-page" data-testid="tariff-page">
      <h1 className="tariff-title">{t('tariffs')}</h1>
      <p className="tariff-subtitle">{t('tariffPrompt')}</p>

      <div className="tariff-grid" data-testid="tariff-grid">
        {tariffs.map(tar => {
          const Icon = TARIFF_ICONS[tar.id] || Clock;
          return (
            <button
              key={tar.id}
              data-testid={`tariff-${tar.id}`}
              onClick={() => handleSelect(tar.id)}
              disabled={tar.disabled}
              className={`tariff-card ${tar.recommended ? 'tariff-card-recommended' : ''} ${tar.disabled ? 'tariff-card-disabled' : ''}`}
            >
              {tar.recommended && <div className="tariff-badge">Best Value</div>}
              <Icon size={32} className="tariff-icon" />
              <h3 className="tariff-card-name">{tar.label}</h3>
              <p className="tariff-card-price">
                {tar.price === 0 ? t('testFree') : `$${tar.price}`}
              </p>
              <p className="tariff-card-minutes">{tar.minutes} {t('min')}</p>
            </button>
          );
        })}
      </div>

      <button data-testid="tariff-back-btn" onClick={() => navigate('/chat')} className="tariff-back">
        {t('back')}
      </button>
    </div>
  );
}
