import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/apiClient';
import { AlertTriangle, CloudRain, HeartCrack, Wind, Sparkles, UtensilsCrossed, Scale, Flame, Globe, Zap } from 'lucide-react';

const ICONS = {
  AlertTriangle, CloudRain, HeartCrack, Wind, Sparkles,
  UtensilsCrossed, Scale, Flame, Globe, Zap,
};

const PROBLEM_IDS = [
  'anxiety', 'depression', 'relationships', 'ptsd', 'self_esteem',
  'eating_disorder', 'weight', 'grief', 'meaning', 'other',
];

const ICON_MAP = {
  anxiety: 'AlertTriangle', depression: 'CloudRain', relationships: 'HeartCrack',
  ptsd: 'Wind', self_esteem: 'Sparkles', eating_disorder: 'UtensilsCrossed',
  weight: 'Scale', grief: 'Flame', meaning: 'Globe', other: 'Zap',
};

export default function ProblemSelection() {
  const { t } = useLanguage();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleSelect = (problemId) => {
    setSelected(problemId);
    navigate('/chat');
    apiClient.put('/user/problem', { problem: problemId })
      .then(() => refreshUser())
      .catch(() => {});
  };

  return (
    <div className="problem-page" data-testid="problem-selection-page">
      <div className="problem-header">
        <h1 className="problem-title">{t('chooseProblems')}</h1>
        <p className="problem-subtitle" translate="no">Miro.Care</p>
      </div>
      <div className="problem-grid" data-testid="problem-grid">
        {PROBLEM_IDS.map((id, index) => {
          const IconComp = ICONS[ICON_MAP[id]];
          const isLarge = id === 'weight' || id === 'anxiety';
          return (
            <button
              key={id}
              data-testid={`problem-${id}`}
              onClick={() => handleSelect(id)}
              className={`problem-card ${isLarge ? 'problem-card-large' : ''} ${selected === id ? 'problem-card-selected' : ''}`}
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="problem-card-icon">
                {IconComp && <IconComp size={28} />}
              </div>
              <span className="problem-card-label">{t(id)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
