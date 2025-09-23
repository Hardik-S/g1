import { useCallback, useMemo, useRef, useState } from 'react';

const initialState = {
  activeTaskId: null,
  sourceBucket: null,
  placeholder: null,
  overBucket: null,
};

const clampIndex = (index, length) => {
  if (Number.isNaN(index) || index < 0) return 0;
  if (index > length) return length;
  return index;
};

const useSharedDragController = () => {
  const [dragState, setDragState] = useState(initialState);
  const dragSnapshotRef = useRef(initialState);

  const commitState = useCallback((next) => {
    dragSnapshotRef.current = next;
    setDragState(next);
  }, []);

  const beginDrag = useCallback((taskId, sourceBucket, initialIndex = 0) => {
    if (!taskId) {
      return;
    }
    const next = {
      activeTaskId: taskId,
      sourceBucket: sourceBucket || null,
      placeholder: {
        bucket: sourceBucket || null,
        index: clampIndex(initialIndex, Number.MAX_SAFE_INTEGER),
      },
      overBucket: sourceBucket || null,
    };
    commitState(next);
  }, [commitState]);

  const resolveState = useCallback(() => {
    return dragState.activeTaskId ? dragState : dragSnapshotRef.current;
  }, [dragState]);

  const updatePlaceholder = useCallback((bucket, index, count = Number.POSITIVE_INFINITY) => {
    const base = resolveState();
    if (!base.activeTaskId) {
      return;
    }
    const next = {
      ...base,
      placeholder: {
        bucket,
        index: clampIndex(index, Number.isFinite(count) ? count : index ?? 0),
      },
      overBucket: bucket,
    };
    commitState(next);
  }, [commitState, resolveState]);

  const clearHover = useCallback((bucket) => {
    const base = resolveState();
    if (!base.activeTaskId) {
      return;
    }
    if (base.placeholder?.bucket !== bucket) {
      const next = {
        ...base,
        overBucket: base.overBucket === bucket ? null : base.overBucket,
      };
      commitState(next);
      return;
    }
    const next = {
      ...base,
      placeholder: null,
      overBucket: base.overBucket === bucket ? null : base.overBucket,
    };
    commitState(next);
  }, [commitState, resolveState]);

  const completeDrop = useCallback((bucket) => {
    const base = resolveState();
    if (!base.activeTaskId) {
      return null;
    }
    const index = base.placeholder?.bucket === bucket ? base.placeholder.index : null;
    dragSnapshotRef.current = initialState;
    setDragState(initialState);
    return {
      taskId: base.activeTaskId,
      sourceBucket: base.sourceBucket,
      index,
    };
  }, [resolveState]);

  const cancelDrag = useCallback(() => {
    setDragState(initialState);
  }, []);

  const value = useMemo(() => ({
    dragState,
    beginDrag,
    updatePlaceholder,
    clearHover,
    completeDrop,
    cancelDrag,
  }), [dragState, beginDrag, updatePlaceholder, clearHover, completeDrop, cancelDrag]);

  return value;
};

export default useSharedDragController;
