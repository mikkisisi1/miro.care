import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, Star, ArrowRight, Play } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const MIRON_PHOTO = 'https://customer-assets.emergentagent.com/job_bd32a9d2-c016-4ed0-a4c8-df57dec03eb4/artifacts/pxuxfsm4_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing" data-testid="landing-page">
      {/* Photo — NO filters, clean */}
      <img src={MIRON_PHOTO} alt="Miron Shakira" className="landing-photo" />

      {/* Title outside glass — just MIRO CARE */}
      <div className="landing-brand" data-testid="landing-title">
        <span className="landing-brand-miro">MIRO</span>
        <span className="landing-brand-care">CARE</span>
      </div>

      {/* Burger in top-left */}
      <button data-testid="landing-menu-btn" onClick={() => setMenuOpen(true)} className="landing-burger">
        <Menu size={24} />
      </button>

      {/* Glass panel overlay on the photo */}
      <div className="landing-glass" data-testid="landing-glass-panel">
        <div className="landing-glass-top">
          <p className="landing-glass-subtitle">{t('subtitle')}</p>
          <p className="landing-glass-desc">{t('missionText')}</p>
        </div>

        <div className="landing-glass-mid">
          <button
            data-testid="landing-start-btn"
            onClick={() => navigate('/problems')}
            className="landing-glass-cta"
          >
            {t('startChat')}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="landing-glass-bottom">
          <div className="landing-glass-info">
            <div className="landing-glass-col">
              <span className="landing-glass-tag">{t('expert')}</span>
              <span className="landing-glass-val">Miron Shakira</span>
            </div>
            <div className="landing-glass-sep" />
            <div className="landing-glass-col">
              <span className="landing-glass-tag">AI</span>
              <span className="landing-glass-val">Claude Sonnet 4.5</span>
            </div>
            <div className="landing-glass-sep" />
            <div className="landing-glass-col landing-glass-radio" onClick={() => navigate('/radio')}>
              <Play size={16} fill="white" />
              <span className="landing-glass-val">Miro Radio</span>
            </div>
          </div>
          <div className="landing-glass-stars">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#FFB800" color="#FFB800" />)}
            <span>5/5</span>
          </div>
        </div>
      </div>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
