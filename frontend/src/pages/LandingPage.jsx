import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Menu } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const MIRON_PHOTO = 'https://customer-assets.emergentagent.com/job_471ad105-27b6-4b16-a680-2ec9de6a061a/artifacts/ija0kf5g_grok_image_1776410408510.jpg';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing" data-testid="landing-page">
      <img src={MIRON_PHOTO} alt="Miron Shakira" className="landing-photo" />

      <button
        className="landing-burger-btn"
        data-testid="landing-burger-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Menu"
      >
        <Menu size={24} strokeWidth={1.5} />
      </button>

      <div className="landing-brand" data-testid="landing-title" translate="no">
        <span className="landing-brand-miro" lang="en">MIRO</span>
        <span className="landing-brand-care" lang="en">CARE</span>
      </div>

      <div className="landing-glass" data-testid="landing-glass-panel">
        <div className="landing-credentials" data-testid="landing-credentials">
          <p className="landing-credentials-name">Miron Shakira</p>
          <ul className="landing-credentials-list">
            <li>Диетолог, нутрициолог</li>
            <li>Психолог (специализация избыточный вес)</li>
            <li>Эксперт научно-спортивной ассоциации №1 в мире | ISSA (USA)</li>
          </ul>
        </div>
        <p className="landing-glass-desc">{t('missionText')}</p>
        <button
          data-testid="landing-start-btn"
          onClick={() => navigate('/chat')}
          className="landing-glass-cta"
        >
          <span className="landing-cta-glow" />
          {t('ctaButton')}
        </button>
      </div>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
