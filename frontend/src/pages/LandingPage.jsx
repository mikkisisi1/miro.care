import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const MIRON_PHOTO = 'https://customer-assets.emergentagent.com/job_bd32a9d2-c016-4ed0-a4c8-df57dec03eb4/artifacts/pxuxfsm4_a2ceHzRs7mSOhk3UJsLG4RwEWT4PfMmLizx1oiZo.webp';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="landing" data-testid="landing-page">
      <img src={MIRON_PHOTO} alt="Miron Shakira" className="landing-photo" />

      <div className="landing-brand" data-testid="landing-title" translate="no">
        <span className="landing-brand-miro" lang="en">MIRO</span>
        <span className="landing-brand-care" lang="en">CARE</span>
      </div>

      <div className="landing-glass" data-testid="landing-glass-panel">
        <p className="landing-glass-subtitle">Miron Shakira — ISSA USA, Stanford University</p>
        <p className="landing-glass-desc">{t('missionText')}</p>
        <button
          data-testid="landing-start-btn"
          onClick={() => navigate('/problems')}
          className="landing-glass-cta"
        >
          <span className="landing-cta-glow" />
          {t('ctaButton')}
        </button>
      </div>
    </div>
  );
}
