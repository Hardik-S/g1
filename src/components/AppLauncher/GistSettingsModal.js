import React from 'react';

const GistSettingsModal = ({
  cancelButtonRef,
  gistIdInputRef,
  gistSettingsForm,
  gistTokenInputRef,
  isOpen,
  onCancel,
  onChange,
  onSubmit,
  saveButtonRef,
}) => {
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
              onChange={onChange('gistId')}
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
              onChange={onChange('gistToken')}
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

export default GistSettingsModal;
