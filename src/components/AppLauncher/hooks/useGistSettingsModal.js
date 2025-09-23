import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  writeGlobalGistSettings,
} from '../../../state/globalGistSettings';
import { verifyGistConnection } from '../../../global/verifyGistConnection';

const useGistSettingsModal = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gistSettingsForm, setGistSettingsForm] = useState({
    gistId: '',
    gistToken: '',
  });
  const [gistSettingsStatus, setGistSettingsStatus] = useState({
    type: null,
    message: '',
  });

  const settingsButtonRef = useRef(null);
  const gistIdInputRef = useRef(null);
  const gistTokenInputRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const gistStatusTimerRef = useRef(null);

  const clearGistStatus = useCallback(() => {
    if (gistStatusTimerRef.current) {
      clearTimeout(gistStatusTimerRef.current);
      gistStatusTimerRef.current = null;
    }

    setGistSettingsStatus({ type: null, message: '' });
  }, []);

  const scheduleGistStatusDismissal = useCallback(() => {
    if (gistStatusTimerRef.current) {
      clearTimeout(gistStatusTimerRef.current);
    }

    gistStatusTimerRef.current = setTimeout(() => {
      setGistSettingsStatus({ type: null, message: '' });
      gistStatusTimerRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => () => {
    if (gistStatusTimerRef.current) {
      clearTimeout(gistStatusTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const initialSettings = readGlobalGistSettings();
    setGistSettingsForm(initialSettings);

    const unsubscribe = subscribeToGlobalGistSettings((nextSettings) => {
      setGistSettingsForm(nextSettings);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      clearGistStatus();
    }
  }, [clearGistStatus, isSettingsOpen]);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsOpen(false);

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        settingsButtonRef.current?.focus();
      });
    } else {
      settingsButtonRef.current?.focus();
    }
  }, []);

  const handleCloseWithoutSaving = useCallback(() => {
    setGistSettingsForm(readGlobalGistSettings());
    closeSettingsModal();
  }, [closeSettingsModal]);

  useEffect(() => {
    if (!isSettingsOpen || typeof document === 'undefined') {
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
        handleCloseWithoutSaving();
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
  }, [handleCloseWithoutSaving, isSettingsOpen]);

  const openSettingsModal = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleGistInputChange = useCallback((field) => (event) => {
    const { value } = event.target;
    setGistSettingsForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleSaveSettings = useCallback(async (event) => {
    event.preventDefault();
    clearGistStatus();

    try {
      const savedSettings = writeGlobalGistSettings({
        gistId: gistSettingsForm.gistId,
        gistToken: gistSettingsForm.gistToken,
      });

      if (savedSettings.gistId) {
        await verifyGistConnection({
          gistId: savedSettings.gistId,
          gistToken: savedSettings.gistToken,
        });
      }

      setGistSettingsStatus({
        type: 'success',
        message: savedSettings.gistId
          ? 'Gist connection verified successfully.'
          : 'Gist settings saved.',
      });
      closeSettingsModal();
      scheduleGistStatusDismissal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGistSettingsStatus({
        type: 'error',
        message: `Failed to verify gist settings: ${errorMessage}`,
      });
      scheduleGistStatusDismissal();
    }
  }, [
    clearGistStatus,
    closeSettingsModal,
    gistSettingsForm,
    scheduleGistStatusDismissal,
  ]);

  return {
    cancelButtonRef,
    closeSettingsModal,
    gistIdInputRef,
    gistSettingsForm,
    gistSettingsStatus,
    gistTokenInputRef,
    handleCloseWithoutSaving,
    handleGistInputChange,
    handleSaveSettings,
    isSettingsOpen,
    openSettingsModal,
    saveButtonRef,
    settingsButtonRef,
  };
};

export default useGistSettingsModal;
