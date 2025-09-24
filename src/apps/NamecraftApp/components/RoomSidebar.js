import React, { useRef } from 'react';
import { formatRelative } from '../utils/dates.js';
import '../NamecraftApp.css';

const fileReader = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const RoomSidebar = ({
  rooms,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onImport,
  storageKey,
}) => {
  const fileInputRef = useRef(null);

  const handleFilePick = async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const room = await fileReader(file);
      onImport(room);
    } catch (error) {
      alert(`Unable to import room JSON: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <aside className="namecraft-sidebar" aria-label="Room controls">
      <h2>Rooms</h2>
      <div className="namecraft-room-list" role="list">
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            className={`namecraft-room-button ${selectedId === room.id ? 'is-active' : ''}`}
            onClick={() => onSelect(room.id)}
          >
            <span className="namecraft-room-title">{room.title}</span>
            <span className="namecraft-room-meta">Updated {formatRelative(room.updatedAt)}</span>
            <span className="namecraft-room-meta">Candidates: {room.names.length}</span>
          </button>
        ))}
        {!rooms.length && <div className="namecraft-empty-state">No rooms yet. Create one to begin.</div>}
      </div>
      <div className="namecraft-sidebar-actions">
        <button type="button" className="namecraft-button is-primary" onClick={() => onCreate('Research Room')}>
          ＋ New Room
        </button>
        <button type="button" className="namecraft-button" onClick={() => fileInputRef.current?.click()}>
          ⬆ Import JSON
        </button>
        <button
          type="button"
          className="namecraft-button"
          onClick={() => {
            if (selectedId) {
              onDelete(selectedId);
            }
          }}
          disabled={rooms.length <= 1}
        >
          🗑 Remove Room
        </button>
        <p className="namecraft-inline-hint">Stored under <code>{storageKey}</code> in localStorage.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />
      </div>
    </aside>
  );
};

export default RoomSidebar;
