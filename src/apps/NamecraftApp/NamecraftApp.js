import React, { useEffect, useMemo, useRef, useState } from 'react';
import './NamecraftApp.css';
import RoomSidebar from './components/RoomSidebar';
import RoomEditor from './components/RoomEditor';
import ResultsPanel from './components/ResultsPanel';
import MergeDialog from './components/MergeDialog';
import { useNamecraftRooms } from './hooks/useNamecraftRooms';
import { createPlatoMarkdown, exportRoomPdf, triggerJsonDownload, copyPlatoToClipboard } from './utils/exporters.js';
import { encodeRoomForShare, buildShareUrl, getShareLimit } from './utils/share.js';
import { nowIso } from './utils/dates.js';

const sanitizeRoom = (room) => ({
  ...room,
  names: Array.isArray(room.names) ? room.names : [],
  scenarios: Array.isArray(room.scenarios) ? room.scenarios : [],
  evaluations: Array.isArray(room.evaluations) ? room.evaluations : [],
  updatedAt: room.updatedAt || nowIso(),
});

const NamecraftApp = () => {
  const {
    rooms,
    selectedRoom,
    selectedId,
    setSelectedId,
    createRoom,
    deleteRoom,
    upsertRoom,
    updateSelectedRoom,
    runEvaluation,
    pendingShareRoom,
    dismissShareRoom,
    helpers,
  } = useNamecraftRooms();

  const [shareLink, setShareLink] = useState('');
  const [shareError, setShareError] = useState('');
  const [mergeContext, setMergeContext] = useState(null);
  const newNameInputRef = useRef(null);

  const evaluations = selectedRoom?.evaluations ?? [];
  const platoMarkdown = useMemo(() => {
    if (!selectedRoom) return '';
    return createPlatoMarkdown(selectedRoom, evaluations);
  }, [selectedRoom, evaluations]);

  const handleRunTest = () => {
    const result = runEvaluation();
    if (result?.length) {
      setShareLink('');
      setShareError('');
    }
  };

  const handleCopyPlato = async (markdown) => {
    try {
      await copyPlatoToClipboard(markdown);
      setShareError('Copied PLATO.md to clipboard.');
    } catch (error) {
      setShareError(`Clipboard copy failed: ${error.message}`);
    }
  };

  const handleGenerateShare = () => {
    if (!selectedRoom) return;
    try {
      const token = encodeRoomForShare(selectedRoom);
      const url = buildShareUrl(token);
      setShareLink(url);
      setShareError('');
    } catch (error) {
      setShareError(error.message);
      setShareLink('');
    }
  };

  const handleExportPdf = async () => {
    if (!selectedRoom) return;
    try {
      await exportRoomPdf(selectedRoom, evaluations);
      setShareError('Saved PDF export.');
    } catch (error) {
      setShareError(error.message);
    }
  };

  const ingestRoom = (incoming, source = 'import') => {
    if (!incoming || !incoming.id) {
      setShareError('Incoming room is missing an id.');
      return;
    }
    const normalized = sanitizeRoom(incoming);
    const existing = rooms.find((room) => room.id === normalized.id);
    if (existing) {
      setMergeContext({ existing, incoming: normalized, source });
    } else {
      upsertRoom(normalized);
      if (source === 'share') {
        dismissShareRoom();
      }
    }
  };

  useEffect(() => {
    if (pendingShareRoom) {
      ingestRoom(pendingShareRoom, 'share');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShareRoom]);

  useEffect(() => {
    const handler = (event) => {
      if (!selectedRoom) return;
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          return;
        }
      }
      const key = event.key.toLowerCase();
      if (key === 't') {
        event.preventDefault();
        handleRunTest();
      } else if (key === 'n') {
        event.preventDefault();
        newNameInputRef.current?.focus();
      } else if (key === 'e') {
        event.preventDefault();
        handleCopyPlato(platoMarkdown);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedRoom, platoMarkdown]);

  const finalizeMerge = (mergedRoom) => {
    upsertRoom(sanitizeRoom(mergedRoom));
    if (mergeContext?.source === 'share') {
      dismissShareRoom();
    }
    setMergeContext(null);
  };

  const cancelMerge = () => {
    if (mergeContext?.source === 'share') {
      dismissShareRoom();
    }
    setMergeContext(null);
  };

  if (!selectedRoom) {
    return (
      <div className="namecraft-app">
        <RoomSidebar
          rooms={rooms}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={createRoom}
          onDelete={deleteRoom}
          onImport={(room) => ingestRoom(room, 'import')}
          storageKey={helpers.storageKey}
        />
        <main className="namecraft-main">
          <section className="namecraft-panel">Create a room to begin testing candidate names.</section>
        </main>
      </div>
    );
  }

  return (
    <div className="namecraft-app" data-testid="namecraft-app">
      <RoomSidebar
        rooms={rooms}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={createRoom}
        onDelete={deleteRoom}
        onImport={(room) => ingestRoom(room, 'import')}
        storageKey={helpers.storageKey}
      />
      <main className="namecraft-main">
        <RoomEditor
          room={selectedRoom}
          updateRoom={updateSelectedRoom}
          helpers={helpers}
          onRunTest={handleRunTest}
          newNameInputRef={newNameInputRef}
        />
        <ResultsPanel
          room={selectedRoom}
          evaluations={evaluations}
          platoMarkdown={platoMarkdown}
          onCopyPlato={handleCopyPlato}
          onExportJson={() => triggerJsonDownload(selectedRoom)}
          onExportPdf={handleExportPdf}
          onGenerateShare={handleGenerateShare}
          shareLink={shareLink}
          shareError={shareError}
          shareLimit={getShareLimit()}
        />
      </main>
      {mergeContext && (
        <MergeDialog
          existing={mergeContext.existing}
          incoming={mergeContext.incoming}
          onResolve={finalizeMerge}
          onCancel={cancelMerge}
        />
      )}
    </div>
  );
};

export default NamecraftApp;
