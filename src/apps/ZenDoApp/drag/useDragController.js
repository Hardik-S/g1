import { useCallback, useMemo, useRef, useState } from 'react';

const INITIAL_STATE = {
  isDragging: false,
  activeTaskId: null,
  sourceBucket: null,
  pointerPosition: null,
  pointerOffset: { x: 0, y: 0 },
  previewSize: { width: 0, height: 0 },
  previewData: null,
  hoverTarget: null,
};

const clampIndex = (index, length) => {
  if (Number.isNaN(index) || index == null) {
    return length;
  }
  return Math.max(0, Math.min(index, length));
};

const useDragController = () => {
  const [dragState, setDragState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const dropHandlerRef = useRef(null);
  const pointerIdRef = useRef(null);
  const listenersRef = useRef(null);

  const updateState = useCallback((updater) => {
    setDragState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      stateRef.current = next;
      return next;
    });
  }, []);

  const removeListeners = useCallback(() => {
    const listeners = listenersRef.current;
    if (!listeners) {
      return;
    }
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.up);
    window.removeEventListener('pointercancel', listeners.cancel);
    listenersRef.current = null;
  }, []);

  const resetDrag = useCallback(() => {
    removeListeners();
    pointerIdRef.current = null;
    dropHandlerRef.current = null;
    updateState(INITIAL_STATE);
  }, [removeListeners, updateState]);

  const cancelDrag = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  const beginDrag = useCallback((event, {
    taskId,
    sourceBucket = null,
    previewData = null,
    onDrop = null,
  } = {}) => {
    if (!event || !taskId || stateRef.current.isDragging) {
      return;
    }

    const rect = typeof event.currentTarget?.getBoundingClientRect === 'function'
      ? event.currentTarget.getBoundingClientRect()
      : null;

    const clientX = event.clientX ?? rect?.left ?? 0;
    const clientY = event.clientY ?? rect?.top ?? 0;
    const offsetX = rect ? clientX - rect.left : 0;
    const offsetY = rect ? clientY - rect.top : 0;

    pointerIdRef.current = event.pointerId ?? 'default';
    dropHandlerRef.current = onDrop;

    const isMatchingPointer = (pointerEvent) => {
      if (pointerIdRef.current == null) {
        return true;
      }
      if (pointerIdRef.current === 'default') {
        return true;
      }
      return pointerEvent.pointerId === pointerIdRef.current;
    };

    const handleMove = (moveEvent) => {
      if (!isMatchingPointer(moveEvent)) {
        return;
      }
      updateState((prev) => {
        if (!prev.isDragging) {
          return prev;
        }
        if (prev.pointerPosition && prev.pointerPosition.x === moveEvent.clientX && prev.pointerPosition.y === moveEvent.clientY) {
          return prev;
        }
        return {
          ...prev,
          pointerPosition: { x: moveEvent.clientX, y: moveEvent.clientY },
        };
      });
    };

    const finalize = (shouldDrop, endEvent) => {
      const snapshot = stateRef.current;
      const dropHandler = dropHandlerRef.current;
      removeListeners();
      pointerIdRef.current = null;
      dropHandlerRef.current = null;
      updateState(INITIAL_STATE);
      if (shouldDrop && dropHandler && snapshot.isDragging) {
        const pointerPosition = endEvent
          ? { x: endEvent.clientX, y: endEvent.clientY }
          : snapshot.pointerPosition;
        dropHandler({ ...snapshot, pointerPosition });
      }
    };

    const handleUp = (upEvent) => {
      if (!isMatchingPointer(upEvent)) {
        return;
      }
      finalize(true, upEvent);
    };

    const handleCancel = (cancelEvent) => {
      if (!isMatchingPointer(cancelEvent)) {
        return;
      }
      finalize(false, cancelEvent);
    };

    listenersRef.current = {
      move: handleMove,
      up: handleUp,
      cancel: handleCancel,
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);

    event.preventDefault();

    updateState({
      isDragging: true,
      activeTaskId: taskId,
      sourceBucket,
      pointerPosition: { x: clientX, y: clientY },
      pointerOffset: { x: offsetX, y: offsetY },
      previewSize: {
        width: rect?.width ?? 0,
        height: rect?.height ?? 0,
      },
      previewData,
      hoverTarget: null,
    });
  }, [removeListeners, updateState]);

  const setHoverTarget = useCallback((target) => {
    updateState((prev) => {
      if (!prev.isDragging) {
        return prev;
      }
      if (!target) {
        if (prev.hoverTarget === null) {
          return prev;
        }
        return {
          ...prev,
          hoverTarget: null,
        };
      }
      const nextIndex = clampIndex(target.index, target.lengthHint ?? Infinity);
      if (prev.hoverTarget && prev.hoverTarget.bucketId === target.bucketId && prev.hoverTarget.index === nextIndex) {
        return prev;
      }
      return {
        ...prev,
        hoverTarget: {
          bucketId: target.bucketId,
          index: nextIndex,
        },
      };
    });
  }, [updateState]);

  const clearHoverTarget = useCallback((bucketId = null) => {
    updateState((prev) => {
      if (!prev.isDragging || !prev.hoverTarget) {
        return prev;
      }
      if (bucketId && prev.hoverTarget.bucketId !== bucketId) {
        return prev;
      }
      return {
        ...prev,
        hoverTarget: null,
      };
    });
  }, [updateState]);

  return useMemo(() => ({
    dragState,
    beginDrag,
    setHoverTarget,
    clearHoverTarget,
    cancelDrag,
  }), [dragState, beginDrag, setHoverTarget, clearHoverTarget, cancelDrag]);
};

export default useDragController;
