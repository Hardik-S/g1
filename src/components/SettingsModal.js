import React, { useEffect, useRef } from 'react';

const SettingsModal = ({
  isOpen,
  gistSettingsForm,
  onFieldChange,
  onCancel,
  onSubmit,
}) => {
  const gistIdInputRef = useRef(null);
  const gistTokenInputRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const saveButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    const focusableElements = () => [
      gistIdInputRef.current,
      gistTokenInputRef.current,
      cancelButtonRef.current,
      saveButtonRef.current,
    ].filter(Boolean);

    const firstElement = focusableElements()[0];
    if (firstElement) {
      setTimeout(() => {
        firstElement.focus();
      }, 0);
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      if (elements.length === 0) {
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !elements.includes(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !elements.includes(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="settings-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gist-settings-title"
      >
        <form onSubmit={onSubmit}>
          <h2 id="gist-settings-title" className="settings-modal-title">
            GitHub Gist Sync
          </h2>

          <div className="settings-field">
            <label htmlFor="gist-id-input">Gist ID</label>
            <input
              id="gist-id-input"
              ref={gistIdInputRef}
              type="text"
              value={gistSettingsForm.gistId}
              onChange={onFieldChange('gistId')}
              placeholder="e.g. a1b2c3d4e5"
              autoComplete="off"
            />
          </div>

          <div className="settings-field">
            <label htmlFor="gist-token-input">Personal Access Token</label>
            <input
              id="gist-token-input"
              ref={gistTokenInputRef}
              type="password"
              value={gistSettingsForm.gistToken}
              onChange={onFieldChange('gistToken')}
              placeholder="ghp_..."
              autoComplete="off"
            />
          </div>

          <div className="settings-modal-actions">
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={onCancel}
              ref={cancelButtonRef}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="settings-primary-btn"
              ref={saveButtonRef}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
