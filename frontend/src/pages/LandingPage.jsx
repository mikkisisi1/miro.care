import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Star, ArrowRight, Play } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const MIRON_PHOTO = 'https://customer-assets.emergentagent.com/job_bd32a9d2-c016-4ed0-a4c8-df57dec03eb4/artifacts/pxuxfsm4_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp';

export default function LandingPage() {
  const { t } = useLanguage();
  const { isGuest } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing" data-testid="landing-page">
      {/* Hero photo background */}
      <div className="landing-photo-wrap">
        <img src={MIRON_PHOTO} alt="Miron Shakira" className="landing-photo" />
        <div className="landing-photo-overlay" />
      </div>

      {/* Top nav */}
      <header className="landing-nav" data-testid="landing-nav">
        <button data-testid="landing-menu-btn" onClick={() => setMenuOpen(true)} className="landing-nav-btn">
          <Menu size={22} />
        </button>
        <nav className="landing-nav-links">
          <button onClick={() => navigate('/problems')} className="landing-nav-link landing-nav-link-active">
            {t('startChat')}
          </button>
          <button onClick={() => navigate('/specialists')} className="landing-nav-link">
            {t('specialists')}
          </button>
          <button onClick={() => navigate('/about')} className="landing-nav-link">
            {t('about')}
          </button>
        </nav>
        <div className="landing-nav-right">
          <span className="landing-nav-expert">Miron Shakira</span>
        </div>
      </header>

      {/* Hero content */}
      <div className="landing-hero">
        <h1 className="landing-title" data-testid="landing-title">Miro.Care</h1>
        <p className="landing-desc">
          {t('missionText')}
        </p>

        <button
          data-testid="landing-start-btn"
          onClick={() => navigate('/problems')}
          className="landing-cta"
        >
          {t('startChat')}
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Bottom glass panel */}
      <div className="landing-bottom">
        <div className="landing-stars">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={16} fill="#FFB800" color="#FFB800" />
          ))}
          <span className="landing-stars-text">5/5</span>
        </div>

        <div className="landing-glass-panel" data-testid="landing-glass-panel">
          <div className="landing-panel-col">
            <span className="landing-panel-tag">{t('expert')}</span>
            <h3 className="landing-panel-title">Miron Shakira</h3>
            <p className="landing-panel-text">ISSA USA, Stanford, 10 000+ clients</p>
          </div>
          <div className="landing-panel-divider" />
          <div className="landing-panel-col">
            <span className="landing-panel-tag">AI</span>
            <h3 className="landing-panel-title">{t('subtitle')}</h3>
            <p className="landing-panel-text">Claude Sonnet 4.5 + MindThera</p>
          </div>
          <div className="landing-panel-media" onClick={() => navigate('/radio')}>
            <div className="landing-panel-play">
              <Play size={20} fill="white" />
            </div>
            <span className="landing-panel-media-label">Miro Radio</span>
          </div>
        </div>

        <div className="landing-dots">
          <span className="landing-dot landing-dot-active" />
          <span className="landing-dot" />
          <span className="landing-dot" />
        </div>
      </div>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
