import React from 'react';
import { X, Send } from 'lucide-react';

export default function ImagePreview({ selectedImage, onRemove, onSend, loading }) {
  if (!selectedImage) return null;

  return (
    <div className="xc-selected-image-preview">
      <img src={selectedImage.preview} alt="Selected" className="xc-preview-thumb" />
      <button className="xc-remove-image-btn" onClick={onRemove}>
        <X size={14} />
      </button>
      <button
        className="xc-send-image-btn"
        onClick={onSend}
        disabled={loading}
        data-testid="send-image-btn"
      >
        <Send size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
