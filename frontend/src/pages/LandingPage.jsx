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
        <div className="landing-credentials" data-testid="landing-credentials">
          <p className="landing-credentials-name">Miron Shakira</p>
          <ul className="landing-credentials-list">
            <li><span className="cred-dot cred-dot--pink"></span>Диетолог, нутрициолог</li>
            <li><span className="cred-dot cred-dot--green"></span>Психолог (специализация избыточный вес)</li>
            <li><span className="cred-dot cred-dot--pink"></span>Эксперт научно-спортивной ассоциации №1 в мире | ISSA (USA)</li>
          </ul>
        </div>
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
