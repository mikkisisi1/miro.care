import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X, User, Mic, Globe, Palette, Radio, Users, Phone,
  Link2, Info, Calendar, LogOut, Sun, Moon, Monitor, ChevronRight
} from 'lucide-react';

export default function BurgerMenu({ open, onClose }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang, languages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showLangs, setShowLangs] = React.useState(false);
  const [showThemes, setShowThemes] = React.useState(false);

  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <div className="menu-overlay" data-testid="burger-menu" onClick={onClose}>
      <div className="menu-panel" onClick={e => e.stopPropagation()}>
        <button data-testid="menu-close-btn" onClick={onClose} className="menu-close">
          <X size={24} />
        </button>

        <div className="menu-user-section">
          <div className="menu-user-avatar"><User size={24} /></div>
          <div>
            <p className="menu-user-name">{user?.name || user?.email?.split('@')[0]}</p>
            <p className="menu-user-email">{user?.email}</p>
          </div>
        </div>

        <nav className="menu-nav">
          <button data-testid="menu-profile" onClick={() => goTo('/profile')} className="menu-item">
            <User size={20} /> <span>{t('profile')}</span> <ChevronRight size={16} />
          </button>

          <button data-testid="menu-voice" onClick={() => goTo('/voice-select')} className="menu-item">
            <Mic size={20} /> <span>{t('chooseVoice')}</span> <ChevronRight size={16} />
          </button>

          <button data-testid="menu-language-toggle" onClick={() => setShowLangs(!showLangs)} className="menu-item">
            <Globe size={20} /> <span>{t('language')}</span> <ChevronRight size={16} className={showLangs ? 'rotate-90' : ''} />
          </button>
          {showLangs && (
            <div className="menu-sub-grid" data-testid="language-grid">
              {languages.map(l => (
                <button
                  key={l.code}
                  data-testid={`lang-${l.code}`}
                  onClick={() => { setLang(l.code); setShowLangs(false); }}
                  className={`menu-lang-btn ${lang === l.code ? 'menu-lang-active' : ''}`}
                >
                  <span className="menu-lang-flag">{l.flag}</span>
                  <span>{l.native}</span>
                </button>
              ))}
            </div>
          )}

          <button data-testid="menu-theme-toggle" onClick={() => setShowThemes(!showThemes)} className="menu-item">
            <Palette size={20} /> <span>{t('theme')}</span> <ChevronRight size={16} className={showThemes ? 'rotate-90' : ''} />
          </button>
          {showThemes && (
            <div className="menu-sub-themes" data-testid="theme-options">
              {[
                { id: 'light', icon: Sun, label: t('light') },
                { id: 'dark', icon: Moon, label: t('dark') },
                { id: 'system', icon: Monitor, label: t('system') },
              ].map(th => (
                <button
                  key={th.id}
                  data-testid={`theme-${th.id}`}
                  onClick={() => { setTheme(th.id); setShowThemes(false); }}
                  className={`menu-theme-btn ${theme === th.id ? 'menu-theme-active' : ''}`}
                >
                  <th.icon size={16} /> {th.label}
                </button>
              ))}
            </div>
          )}

          <button data-testid="menu-radio" onClick={() => goTo('/radio')} className="menu-item">
            <Radio size={20} /> <span>{t('radio')}</span> <ChevronRight size={16} />
          </button>

          <button data-testid="menu-specialists" onClick={() => goTo('/specialists')} className="menu-item">
            <Users size={20} /> <span>{t('specialists')}</span> <ChevronRight size={16} />
          </button>

          <button data-testid="menu-about" onClick={() => goTo('/about')} className="menu-item">
            <Info size={20} /> <span>{t('about')}</span> <ChevronRight size={16} />
          </button>

          <button data-testid="menu-book" onClick={() => window.open('https://shakiramiron.taplink.ws', '_blank')} className="menu-item menu-item-highlight">
            <Calendar size={20} /> <span>{t('bookPsychologist')}</span> <ChevronRight size={16} />
          </button>
        </nav>

        <button data-testid="menu-logout" onClick={handleLogout} className="menu-logout">
          <LogOut size={20} /> <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}
