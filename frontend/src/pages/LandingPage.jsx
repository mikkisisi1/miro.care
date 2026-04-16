import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Menu, ArrowRight } from 'lucide-react';
import BurgerMenu from '@/components/BurgerMenu';

const MIRON_PHOTO = 'https://customer-assets.emergentagent.com/job_bd32a9d2-c016-4ed0-a4c8-df57dec03eb4/artifacts/pxuxfsm4_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing" data-testid="landing-page">
      <img src={MIRON_PHOTO} alt="Miron Shakira" className="landing-photo" />

      <div className="landing-brand" data-testid="landing-title">
        <span className="landing-brand-miro">MIRO</span>
        <span className="landing-brand-care">CARE</span>
      </div>

      <button data-testid="landing-menu-btn" onClick={() => setMenuOpen(true)} className="landing-burger">
        <Menu size={24} />
      </button>

      <div className="landing-glass" data-testid="landing-glass-panel">
        <p className="landing-glass-subtitle">{t('subtitle')}</p>
        <p className="landing-glass-desc">{t('missionText')}</p>
        <button
          data-testid="landing-start-btn"
          onClick={() => navigate('/problems')}
          className="landing-glass-cta"
        >
          {t('startChat')}
          <ArrowRight size={16} />
        </button>
      </div>

      <BurgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
