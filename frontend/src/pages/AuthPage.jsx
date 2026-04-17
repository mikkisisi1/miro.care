import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, Lock, User, ArrowRight, Heart } from 'lucide-react';

const MIRON_HERO = 'https://customer-assets.emergentagent.com/job_xicon-preview-3/artifacts/da8jruwh_bbSt44ErT9oMjoxUeM0T1pEHQxCQwYb0Q9QsI9mn.webp';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/problems');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      else setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/problems');
  };

  return (
    <div className="auth-page" data-testid="auth-page">
      <div className="auth-ambient" />
      <img src={MIRON_HERO} alt="" className="auth-hero-photo" />
      <div className="auth-container">
        <div className="auth-logo-section">
          <div className="auth-logo-icon">
            <Heart className="auth-heart-icon" />
          </div>
          <h1 className="auth-title" translate="no">Miro.Care</h1>
          <p className="auth-subtitle">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" data-testid="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <User size={18} className="auth-field-icon" />
              <input
                data-testid="auth-name-input"
                type="text"
                placeholder={t('name')}
                value={name}
                onChange={e => setName(e.target.value)}
                className="auth-input"
              />
            </div>
          )}
          <div className="auth-field">
            <Mail size={18} className="auth-field-icon" />
            <input
              data-testid="auth-email-input"
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="auth-input"
            />
          </div>
          <div className="auth-field">
            <Lock size={18} className="auth-field-icon" />
            <input
              data-testid="auth-password-input"
              type="password"
              placeholder={t('password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="auth-input"
            />
          </div>

          {error && <p className="auth-error" data-testid="auth-error">{error}</p>}

          <button
            data-testid="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading ? '...' : (isLogin ? t('login') : t('register'))}
            <ArrowRight size={18} />
          </button>

          <button
            data-testid="auth-skip-btn"
            type="button"
            onClick={handleSkip}
            className="auth-skip"
          >
            {t('later') || 'Позже'}
          </button>
        </form>

        <button
          data-testid="auth-toggle-btn"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="auth-toggle"
        >
          {isLogin ? t('noAccount') : t('haveAccount')}
          <span className="auth-toggle-action">{isLogin ? t('register') : t('login')}</span>
        </button>
      </div>
    </div>
  );
}
