import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X, User, Mic, Globe, Palette, Radio, Users,
  Link2, Info, Calendar, LogOut, LogIn, Sun, Moon, Monitor, ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'voice', icon: Mic, labelKey: 'chooseVoice', path: '/voice-select' },
  { id: 'radio', icon: Radio, labelKey: 'radio', path: '/radio' },
  { id: 'specialists', icon: Users, labelKey: 'specialists', path: '/specialists' },
  { id: 'about', icon: Info, labelKey: 'about', path: '/about' },
];

const THEME_OPTIONS = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
];

function LanguageGrid({ languages, lang, setLang, onClose }) {
  return (
    <div className="menu-sub-grid" data-testid="language-grid">
      {languages.map(l => (
        <button
          key={l.code}
          data-testid={`lang-${l.code}`}
          onClick={() => { setLang(l.code); onClose(); }}
          className={`menu-lang-btn ${lang === l.code ? 'menu-lang-active' : ''}`}
        >
          <span className="menu-lang-flag">{l.flag}</span>
          <span>{l.native}</span>
        </button>
      ))}
    </div>
  );
}

function ThemeOptions({ theme, setTheme, t, onClose }) {
  return (
    <div className="menu-sub-themes" data-testid="theme-options">
      {THEME_OPTIONS.map(th => (
        <button
          key={th.id}
          data-testid={`theme-${th.id}`}
          onClick={() => { setTheme(th.id); onClose(); }}
          className={`menu-theme-btn ${theme === th.id ? 'menu-theme-active' : ''}`}
        >
          <th.icon size={16} /> {t(th.id)}
        </button>
      ))}
    </div>
  );
}

export default function BurgerMenu({ open, onClose }) {
  const { user, logout, isGuest } = useAuth();
  const { t, lang, setLang, languages } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showLangs, setShowLangs] = React.useState(false);
  const [showThemes, setShowThemes] = React.useState(false);

  if (!open) return null;

  const goTo = (path) => { onClose(); navigate(path); };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/problems');
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
            <p className="menu-user-name">{isGuest ? 'Demo' : (user?.name || user?.email?.split('@')[0])}</p>
            <p className="menu-user-email">{isGuest ? 'Guest mode' : user?.email}</p>
          </div>
        </div>

        <nav className="menu-nav">
          {isGuest && (
            <button data-testid="menu-auth" onClick={() => goTo('/auth')} className="menu-item menu-item-highlight">
              <LogIn size={20} /> <span>{t('login')} / {t('register')}</span> <ChevronRight size={16} />
            </button>
          )}

          {!isGuest && (
            <button data-testid="menu-profile" onClick={() => goTo('/profile')} className="menu-item">
              <User size={20} /> <span>{t('profile')}</span> <ChevronRight size={16} />
            </button>
          )}

          {MENU_ITEMS.map(item => (
            <button key={item.id} data-testid={`menu-${item.id}`} onClick={() => goTo(item.path)} className="menu-item">
              <item.icon size={20} /> <span>{t(item.labelKey)}</span> <ChevronRight size={16} />
            </button>
          ))}

          <button data-testid="menu-language-toggle" onClick={() => setShowLangs(!showLangs)} className="menu-item">
            <Globe size={20} /> <span>{t('language')}</span> <ChevronRight size={16} className={showLangs ? 'rotate-90' : ''} />
          </button>
          {showLangs && <LanguageGrid languages={languages} lang={lang} setLang={setLang} onClose={() => setShowLangs(false)} />}

          <button data-testid="menu-theme-toggle" onClick={() => setShowThemes(!showThemes)} className="menu-item">
            <Palette size={20} /> <span>{t('theme')}</span> <ChevronRight size={16} className={showThemes ? 'rotate-90' : ''} />
          </button>
          {showThemes && <ThemeOptions theme={theme} setTheme={setTheme} t={t} onClose={() => setShowThemes(false)} />}

          <button data-testid="menu-book" onClick={() => goTo('/booking')} className="menu-item menu-item-highlight">
            <Calendar size={20} /> <span>{t('bookPsychologist')}</span> <ChevronRight size={16} />
          </button>
        </nav>

        {!isGuest && (
          <button data-testid="menu-logout" onClick={handleLogout} className="menu-logout">
            <LogOut size={20} /> <span>{t('logout')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
