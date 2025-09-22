import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ZenDoApp.css';
import LandingView from './views/LandingView';
import TodayView from './views/TodayView';
import FocusView from './views/FocusView';
import ArchiveView from './views/ArchiveView';
import TaskEditorModal from './modals/TaskEditorModal';
import useZenDoState from './useZenDoState';
import { DAY_ORDER } from './constants';
import { flattenTasks, sortTasksByDueDate } from './taskUtils';
import { writeGlobalGistSettings } from '../../state/globalGistSettings';

const VIEW_TABS = [
  { id: 'landing', label: 'Landing' },
  { id: 'today', label: 'Today' },
  { id: 'focus', label: 'Focus' },
  { id: 'archive', label: 'Archive' },
];

const ZenDoApp = ({ onBack }) => {
  const [currentView, setCurrentView] = useState('landing');
  const [now, setNow] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editorState, setEditorState] = useState({ open: false, mode: 'create', task: null, parentId: null, parentTitle: '' });

  const {
    tasks,
    appendTask,
    mutateTask,
    removeTask,
    completeTask,
    placeTaskInDay,
    reorderDay,
    placeInFocusBucket,
    reorderFocus,
    clearFocus,
    gistConfig,
    setGistConfig,
    markLocalGlobalSettingsUpdate,
    syncStatus,
    pullFromGist,
    pushToGist,
  } = useZenDoState();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = DAY_ORDER[now.getDay()];
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const activeTasks = useMemo(() => sortTasksByDueDate(tasks.filter((task) => !task.completed)), [tasks]);

  const completedTasks = useMemo(() => flattenTasks(tasks, true)
    .filter(({ task }) => task.completed)
    .map(({ task }) => task), [tasks]);

  const dayAssignments = useMemo(() => {
    const mapping = {};
    tasks.forEach((task) => {
      if (task.completed) return;
      const dayKey = task.schedule?.day;
      if (!dayKey) return;
      if (!mapping[dayKey]) {
        mapping[dayKey] = [];
      }
      mapping[dayKey].push(task);
    });
    Object.keys(mapping).forEach((dayKey) => {
      mapping[dayKey].sort((a, b) => (a.schedule?.order || 0) - (b.schedule?.order || 0));
    });
    return mapping;
  }, [tasks]);

  const focusAssignments = useMemo(() => {
    const priority = [];
    const bonus = [];
    tasks.forEach((task) => {
      if (task.completed) return;
      if (task.schedule?.day !== todayKey) return;
      if (task.schedule?.focusBucket === 'priority') {
        priority.push(task);
      } else if (task.schedule?.focusBucket === 'bonus') {
        bonus.push(task);
      }
    });
    priority.sort((a, b) => (a.schedule?.focusOrder || 0) - (b.schedule?.focusOrder || 0));
    bonus.sort((a, b) => (a.schedule?.focusOrder || 0) - (b.schedule?.focusOrder || 0));
    return { priority, bonus };
  }, [tasks, todayKey]);

  const todayList = useMemo(() => tasks
    .filter((task) => !task.completed && task.schedule?.day === todayKey && !task.schedule?.focusBucket)
    .sort((a, b) => (a.schedule?.order || 0) - (b.schedule?.order || 0)), [tasks, todayKey]);

  const handleToggleExpand = (taskId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleAddRootTask = () => {
    setEditorState({ open: true, mode: 'create', task: null, parentId: null, parentTitle: '' });
  };

  const handleEditTask = (task) => {
    setEditorState({ open: true, mode: 'edit', task, parentId: null, parentTitle: '' });
  };

  const handleAddSubtask = (parentId) => {
    const flat = flattenTasks(tasks, true).find(({ task }) => task.id === parentId);
    setEditorState({
      open: true,
      mode: 'create',
      task: null,
      parentId,
      parentTitle: flat?.task?.title || 'Task',
    });
    setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const closeEditor = () => {
    setEditorState({ open: false, mode: 'create', task: null, parentId: null, parentTitle: '' });
  };

  const handleSaveTask = (draft) => {
    if (editorState.mode === 'edit' && editorState.task) {
      mutateTask(editorState.task.id, (current) => ({
        ...current,
        title: draft.title,
        description: draft.description,
        dueDate: draft.dueDate,
        subtasks: draft.subtasks || [],
      }));
    } else if (editorState.parentId) {
      appendTask({ ...draft }, editorState.parentId);
    } else {
      appendTask({ ...draft }, null);
    }
  };

  const handleDeleteTask = (taskId) => {
    removeTask(taskId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const handleAssignDay = useCallback((taskId, dayKey, position) => {
    placeTaskInDay(taskId, dayKey, position);
  }, [placeTaskInDay]);

  const handleReorderDay = useCallback((dayKey, orderedIds) => {
    reorderDay(dayKey, orderedIds);
  }, [reorderDay]);

  const handleAssignFocus = useCallback((taskId, bucket, position) => {
    placeInFocusBucket(taskId, bucket, position);
  }, [placeInFocusBucket]);

  const handleReorderFocus = useCallback((bucket, orderedIds) => {
    if (bucket === 'priority' || bucket === 'bonus') {
      reorderFocus(bucket, orderedIds);
    } else if (bucket === 'today') {
      reorderDay(todayKey, orderedIds);
    }
  }, [reorderFocus, reorderDay, todayKey]);

  const handleClearFocus = useCallback((taskId) => {
    clearFocus(taskId);
  }, [clearFocus]);

  const handleTabChange = (tabId) => {
    if (tabId === 'today') {
      setCurrentView('today');
    } else if (tabId === 'focus') {
      setCurrentView('focus');
    } else if (tabId === 'archive') {
      setCurrentView('archive');
    } else {
      setCurrentView('landing');
    }
  };

  const gistFilename = gistConfig.filename || 'zen-do-data.json';

  return (
    <div className="zen-app-shell">
      <header className="zen-app-header">
        <div className="zen-header-left">
          {onBack && (
            <button type="button" className="zen-inline-btn zen-back-btn" onClick={onBack}>
              ← Back to Apps
            </button>
          )}
          <h1>Zen Do</h1>
          <div className="zen-header-meta">
            <span>{dateLabel}</span>
            <span>{timeLabel}</span>
          </div>
        </div>
        <nav className="zen-header-nav">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`zen-tab ${currentView === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="zen-sync-panel">
            <div className="zen-sync-row">
              <label>
                Gist ID
                <input
                  value={gistConfig.gistId || ''}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setGistConfig((prev) => ({ ...prev, gistId: nextValue }));
                    markLocalGlobalSettingsUpdate();
                    writeGlobalGistSettings({
                      gistId: nextValue,
                      gistToken: gistConfig.gistToken || '',
                    });
                  }}
                  placeholder="Public gist ID"
                />
              </label>
              <label>
                Token
                <input
                  type="password"
                  value={gistConfig.gistToken || ''}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setGistConfig((prev) => ({ ...prev, gistToken: nextValue }));
                    markLocalGlobalSettingsUpdate();
                    writeGlobalGistSettings({
                      gistId: gistConfig.gistId || '',
                      gistToken: nextValue,
                    });
                  }}
                  placeholder="Optional PAT"
                />
              </label>
            <label>
              File
              <input
                value={gistFilename}
                onChange={(e) => setGistConfig((prev) => ({ ...prev, filename: e.target.value }))}
              />
            </label>
          </div>
          <div className="zen-sync-row">
            <button type="button" onClick={pullFromGist} className="zen-inline-btn">
              Pull
            </button>
            <button type="button" onClick={pushToGist} className="zen-inline-btn">
              Push
            </button>
            <span className={`zen-sync-status ${syncStatus.type}`}>
              {syncStatus.message}
            </span>
          </div>
        </div>
      </header>

      <main className={`zen-view ${currentView}`}>
        {currentView === 'landing' && (
          <LandingView
            tasks={activeTasks}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onCompleteTask={completeTask}
            onAddSubtask={handleAddSubtask}
            onAddRootTask={handleAddRootTask}
            dayAssignments={dayAssignments}
            onAssignTaskToDay={handleAssignDay}
            onReorderDay={handleReorderDay}
            onLaunchToday={() => setCurrentView('today')}
          />
        )}

        {currentView === 'today' && (
          <TodayView
            todayList={todayList}
            priorityList={focusAssignments.priority}
            bonusList={focusAssignments.bonus}
            onAssignToBucket={handleAssignFocus}
            onReorderBucket={handleReorderFocus}
            onClearBucket={handleClearFocus}
            onBackToLanding={() => setCurrentView('landing')}
            onOpenFocus={() => setCurrentView('focus')}
            onCompleteTask={completeTask}
          />
        )}

        {currentView === 'focus' && (
          <FocusView
            priorityList={focusAssignments.priority}
            bonusList={focusAssignments.bonus}
            onCompleteTask={completeTask}
            onBackToToday={() => setCurrentView('today')}
          />
        )}

        {currentView === 'archive' && (
          <ArchiveView
            completedTasks={completedTasks}
            onBackToLanding={() => setCurrentView('landing')}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>

      <TaskEditorModal
        open={editorState.open}
        onClose={closeEditor}
        onSave={handleSaveTask}
        initialTask={editorState.task}
        parentTitle={editorState.parentTitle}
      />
    </div>
  );
};

export default ZenDoApp;
