import React, { useEffect, useMemo, useState } from 'react';
import './CatPadApp.css';
import useCatPadNotes from './hooks/useCatPadNotes';
import useCatPadSync from './hooks/useCatPadSync';
import { DEFAULT_SYNC_FILENAME } from './sync';

const statusIconMap = {
  idle: '☁️',
  syncing: '🐾',
  success: '😺',
  error: '⚠️',
};

const catTips = [
  'Public gists work great for read-only sync. Add a token to update from any device.',
  'Create a fine-grained GitHub token with only the “gist” scope for extra safety.',
  'Tap “Pull latest” after switching devices to be sure you have the newest whisker scribbles.',
  'Auto-sync keeps notes aligned every time CatPad saves a change.',
];

const CatPadApp = () => {
  const notes = useCatPadNotes();
  const sync = useCatPadSync(notes);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!notes.isLoading && !sync.isLoading) {
      setTipIndex(Math.floor(Math.random() * catTips.length));
    }
  }, [notes.isLoading, sync.isLoading]);

  const isLoading = notes.isLoading || sync.isLoading;
  const syncStateIcon = useMemo(
    () => statusIconMap[sync.syncStatus.type] || statusIconMap.idle,
    [sync.syncStatus.type],
  );

  if (isLoading) {
    return (
      <div className="catpad-app catpad-loading">
        <div className="catpad-loader" role="status" aria-live="polite">
          <div className="catpad-paw-spinner" />
          <p>Stretching whiskers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catpad-app">
      <div className="catpad-layout">
        <aside className="catpad-sidebar">
          <div className="catpad-sidebar-header">
            <h2>Cat Files</h2>
            <button type="button" className="catpad-primary" onClick={notes.handleNewNote}>
              + New note
            </button>
          </div>
          <div className="catpad-note-list" role="list">
            {notes.notes.length === 0 && (
              <div className="catpad-empty">No notes yet — start a new cat tale!</div>
            )}
            {notes.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                role="listitem"
                className={`catpad-note-item ${note.id === notes.activeNoteId ? 'active' : ''}`}
                onClick={() => notes.handleSelectNote(note.id)}
              >
                <div className="catpad-note-title">{note.title || 'Untitled Cat'}</div>
                <div className="catpad-note-meta">Updated {notes.formatRelativeTime(note.updatedAt)}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="catpad-editor" aria-label="CatPad editor">
          <div className="catpad-editor-toolbar">
            <input
              className="catpad-title-input"
              type="text"
              value={notes.draftTitle}
              onChange={(event) => notes.setDraftTitle(event.target.value)}
              placeholder="Name your cat note"
            />
            <div className="catpad-toolbar-actions">
              <button type="button" className="catpad-secondary" onClick={notes.handleManualSave}>
                Save
              </button>
              <button
                type="button"
                className="catpad-danger"
                onClick={() => notes.activeNote && notes.handleDeleteNote(notes.activeNote.id)}
                disabled={!notes.activeNote}
              >
                Delete
              </button>
            </div>
          </div>
          <textarea
            className="catpad-textarea"
            value={notes.draftContent}
            onChange={(event) => notes.setDraftContent(event.target.value)}
            placeholder="Write something delightful for your feline friends…"
          />
          <div className="catpad-status-row">
            <div className={`catpad-sync-status ${sync.syncStatus.type}`}>
              <span className="catpad-sync-icon" aria-hidden="true">{syncStateIcon}</span>
              <span>{sync.syncStatus.message}</span>
            </div>
            <div className="catpad-save-meta">
              <span>Last local save: {notes.formatRelativeTime(notes.lastLocalSaveAt)}</span>
            </div>
          </div>
        </section>

        <aside className="catpad-settings" aria-label="Cloud sync settings">
          <h2>Cloud Sync</h2>
          <p className="catpad-settings-blurb">
            CatPad syncs through a GitHub gist so every browser shares the same scratchpad. Enter a gist ID and a
            GitHub token with the <code>gist</code> scope. Your token never leaves this device.
          </p>

          <label className="catpad-field">
            <span>Enable cloud sync</span>
            <input
              type="checkbox"
              checked={sync.settings.syncEnabled}
              onChange={(event) => sync.handleSettingsChange('syncEnabled', event.target.checked)}
            />
          </label>

          <label className="catpad-field">
            <span>Gist ID</span>
            <input
              type="text"
              value={sync.settings.gistId}
              onChange={(event) => sync.handleSettingsChange('gistId', event.target.value)}
              placeholder="e.g. a1b2c3d4e5f6"
            />
          </label>

          <label className="catpad-field">
            <span>Filename</span>
            <input
              type="text"
              value={sync.settings.gistFilename}
              onChange={(event) => sync.handleSettingsChange('gistFilename', event.target.value || DEFAULT_SYNC_FILENAME)}
              placeholder={DEFAULT_SYNC_FILENAME}
            />
          </label>

          <label className="catpad-field">
            <span>GitHub token</span>
            <input
              type="password"
              value={sync.gistToken}
              onChange={async (event) => {
                await sync.updateTokenValue(event.target.value);
              }}
              placeholder="ghp_…"
            />
          </label>

          <label className="catpad-field catpad-remember">
            <input
              type="checkbox"
              checked={sync.settings.rememberToken}
              onChange={async (event) => {
                await sync.updateRememberToken(event.target.checked);
              }}
            />
            <span>Remember token on this device</span>
          </label>

          <label className="catpad-field">
            <span>Auto-sync after edits</span>
            <input
              type="checkbox"
              checked={sync.settings.autoSync}
              onChange={(event) => sync.handleSettingsChange('autoSync', event.target.checked)}
              disabled={!sync.settings.syncEnabled}
            />
          </label>

          <div className="catpad-sync-actions">
            <button
              type="button"
              className="catpad-secondary"
              onClick={() => sync.pullFromRemote('manual')}
              disabled={!sync.settings.syncEnabled || !sync.settings.gistId}
            >
              Pull latest
            </button>
            <button
              type="button"
              className="catpad-primary"
              onClick={() => sync.pushToRemote('manual')}
              disabled={!sync.canPush}
            >
              Push changes
            </button>
          </div>

          <div className="catpad-tip">
            <span className="catpad-tip-icon" aria-hidden="true">🐈</span>
            <p>{catTips[tipIndex]}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CatPadApp;
