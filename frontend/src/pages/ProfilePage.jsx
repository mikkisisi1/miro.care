import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Mail, User, FileText } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!user) return null;

  const formatTime = (mins) => {
    if (!mins) return '0 ' + t('min');
    if (mins >= 60) return `${Math.floor(mins / 60)}${t('hours')} ${mins % 60}${t('min')}`;
    return `${mins} ${t('min')}`;
  };

  return (
    <div className="profile-page" data-testid="profile-page">
      <header className="page-header">
        <button data-testid="profile-back-btn" onClick={() => navigate(-1)} className="header-back-btn">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('profile')}</h1>
      </header>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <User size={40} />
          </div>
          <h2 className="profile-name">{user.name || user.email?.split('@')[0]}</h2>
          <p className="profile-email">
            <Mail size={14} />
            {user.email}
          </p>
        </div>

        <div className="profile-stats">
          <div className="profile-stat-card">
            <Clock size={24} />
            <div>
              <p className="profile-stat-label">{t('minutesLeft')}</p>
              <p className="profile-stat-value">{formatTime(user.minutes_left)}</p>
            </div>
          </div>
          <div className="profile-stat-card">
            <FileText size={24} />
            <div>
              <p className="profile-stat-label">{t('tariffs')}</p>
              <p className="profile-stat-value">{user.tariff || 'Free'}</p>
            </div>
          </div>
        </div>

        {user.last_plan && (
          <div className="profile-plan" data-testid="saved-plan">
            <h3>Saved Plan</h3>
            <div className="profile-plan-text">
              {user.last_plan.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
