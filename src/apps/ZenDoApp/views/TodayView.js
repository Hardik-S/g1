import React, { useCallback } from 'react';
import { FOCUS_BUCKETS } from '../constants';
import DroppableBucket from './DroppableBucket';
import useSharedDragController from './useSharedDragController';

const buildOrder = (tasks, taskId, index) => {
  const ids = tasks.filter((task) => task.id !== taskId).map((task) => task.id);
  const clampedIndex = Math.max(0, Math.min(index, ids.length));
  ids.splice(clampedIndex, 0, taskId);
  return ids;
};

const getBucketList = (bucket, lists) => {
  if (bucket === 'today') return lists.todayList;
  if (bucket === 'priority') return lists.priorityList;
  if (bucket === 'bonus') return lists.bonusList;
  return [];
};

const TaskCard = ({ bucketId, dragController, index, onQuickAssign, task }) => {
  const handleDragStart = useCallback((event) => {
    if (event.dataTransfer) {
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
      } catch (error) {
        // Ignore errors from unsupported dataTransfer operations in tests.
      }
    }
    dragController.beginDrag(task.id, bucketId, index);
  }, [bucketId, dragController, index, task.id]);

  const handleDragEnd = useCallback(() => {
    dragController.cancelDrag();
  }, [dragController]);

  const handleQuickAssignClick = useCallback((targetBucket) => (event) => {
    event.stopPropagation();
    if (onQuickAssign) {
      onQuickAssign(task.id, targetBucket);
    }
  }, [onQuickAssign, task.id]);

  return (
    <div
      className="zen-focus-card"
      data-task-id={task.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="zen-card-title-row">
        <span>{task.title}</span>
        {bucketId === 'today' && onQuickAssign && (
          <div className="zen-task-quick-actions">
            <button
              type="button"
              className="zen-task-action-btn zen-task-action-btn--priority"
              aria-label="Quick assign to Priority"
              onClick={handleQuickAssignClick('priority')}
            >
              P
            </button>
            <button
              type="button"
              className="zen-task-action-btn zen-task-action-btn--bonus"
              aria-label="Quick assign to Bonus"
              onClick={handleQuickAssignClick('bonus')}
            >
              B
            </button>
          </div>
        )}
      </div>
      {task.dueDate && <div className="zen-card-meta">Due {task.dueDate}</div>}
    </div>
  );
};

const TodayView = ({
  todayList,
  priorityList,
  bonusList,
  onAssignToBucket,
  onReorderBucket,
  onClearBucket,
  onBackToLanding,
  onOpenFocus,
}) => {
  const dragController = useSharedDragController();

  const handleDrop = useCallback((targetBucket) => ({ taskId, sourceBucket, index }) => {
    if (!taskId) {
      return;
    }
    const bucketLists = { todayList, priorityList, bonusList };
    const targetList = getBucketList(targetBucket, bucketLists);
    const clampedIndex = Math.max(0, Math.min(index ?? targetList.length, targetList.length));

    if (targetBucket === 'today') {
      onClearBucket(taskId);
      const nextOrder = buildOrder(targetList, taskId, clampedIndex);
      onReorderBucket('today', nextOrder);
    } else if (targetBucket === 'priority' || targetBucket === 'bonus') {
      onAssignToBucket(taskId, targetBucket, clampedIndex);
      const nextOrder = buildOrder(targetList, taskId, clampedIndex);
      onReorderBucket(targetBucket, nextOrder);
    }

    const knownBuckets = ['today', 'priority', 'bonus'];
    if (sourceBucket && sourceBucket !== targetBucket && knownBuckets.includes(sourceBucket)) {
      const sourceList = getBucketList(sourceBucket, bucketLists);
      const sourceOrder = sourceList.filter((task) => task.id !== taskId).map((task) => task.id);
      onReorderBucket(sourceBucket, sourceOrder);
    } else if (sourceBucket && sourceBucket === targetBucket && knownBuckets.includes(sourceBucket)) {
      const sourceList = getBucketList(sourceBucket, bucketLists);
      const nextOrder = buildOrder(sourceList, taskId, clampedIndex);
      onReorderBucket(sourceBucket, nextOrder);
    }
  }, [bonusList, onAssignToBucket, onClearBucket, onReorderBucket, priorityList, todayList]);

  const handleQuickAssign = useCallback((taskId, targetBucket) => {
    if (targetBucket !== 'priority' && targetBucket !== 'bonus') {
      return;
    }

    const targetList = targetBucket === 'priority' ? priorityList : bonusList;
    const insertIndex = targetList.length;

    onAssignToBucket(taskId, targetBucket, insertIndex);

    const nextTargetOrder = buildOrder(targetList, taskId, insertIndex);
    onReorderBucket(targetBucket, nextTargetOrder);

    const nextTodayOrder = todayList
      .filter((task) => task.id !== taskId)
      .map((task) => task.id);
    onReorderBucket('today', nextTodayOrder);
  }, [bonusList, onAssignToBucket, onReorderBucket, priorityList, todayList]);

  const renderTask = useCallback((task, index, bucketId) => (
    <TaskCard
      key={task.id}
      task={task}
      index={index}
      bucketId={bucketId}
      dragController={dragController}
      onQuickAssign={bucketId === 'today' ? handleQuickAssign : undefined}
    />
  ), [dragController, handleQuickAssign]);

  return (
    <div className="zen-today-layout">
      <section className="zen-today-column">
        <header className="zen-section-header">
          <button type="button" className="zen-inline-btn" onClick={onBackToLanding}>
            ← Back to Landing
          </button>
          <h2>Today&apos;s Flow</h2>
        </header>
        <DroppableBucket
          bucketId="today"
          className="zen-today-list"
          dragController={dragController}
          emptyHint="Drag tasks from the week buckets or create something new."
          items={todayList}
          onDrop={handleDrop('today')}
          renderItem={renderTask}
          testId="today-drop-zone"
        />
      </section>
      <section className="zen-today-column">
        <header className="zen-section-header">
          <h2>Focus Buckets</h2>
        </header>
        <div className="zen-focus-grid">
          <div className="zen-focus-column">
            <h3>{FOCUS_BUCKETS.priority.title}</h3>
            <DroppableBucket
              bucketId="priority"
              className="zen-focus-drop"
              dragController={dragController}
              emptyHint="Set your core intentions here."
              items={priorityList}
              onDrop={handleDrop('priority')}
              renderItem={renderTask}
              testId="priority-drop-zone"
            />
          </div>
          <div className="zen-focus-column">
            <h3>{FOCUS_BUCKETS.bonus.title}</h3>
            <DroppableBucket
              bucketId="bonus"
              className="zen-focus-drop"
              dragController={dragController}
              emptyHint="Reserve bonus blooms for extra energy."
              items={bonusList}
              onDrop={handleDrop('bonus')}
              renderItem={renderTask}
              testId="bonus-drop-zone"
            />
          </div>
        </div>
        <div className="zen-focus-footer">
          <button type="button" className="zen-primary-btn" onClick={onOpenFocus}>
            Enter Focus Mode ▶
          </button>
        </div>
      </section>
    </div>
  );
};

export default TodayView;
