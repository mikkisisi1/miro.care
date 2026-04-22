import React from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ImagePickerModal({ onClose, onCamera, onGallery }) {
  const { t } = useLanguage();

  return (
    <div className="xc-image-picker-overlay" onClick={onClose}>
      <div className="xc-image-picker-modal" onClick={e => e.stopPropagation()}>
        <button
          className="xc-image-picker-option"
          data-testid="camera-option-btn"
          onClick={() => { onClose(); onCamera(); }}
        >
          <Camera size={20} strokeWidth={1.5} />
          {t('camera') || 'Camera'}
        </button>
        <button
          className="xc-image-picker-option"
          data-testid="gallery-option-btn"
          onClick={() => { onClose(); onGallery(); }}
        >
          <ImageIcon size={20} strokeWidth={1.5} />
          {t('gallery') || 'Gallery'}
        </button>
        <p className="xc-image-picker-privacy" data-testid="photo-privacy-note">{t('photoPrivacy')}</p>
      </div>
    </div>
  );
}
