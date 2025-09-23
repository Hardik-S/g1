import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './ZenDoApp.css';
import LandingView from './views/LandingView';
import TodayView from './views/TodayView';
import FocusView from './views/FocusView';
import GardenView from './views/GardenView';
import ArchiveView from './views/ArchiveView';
import TaskEditorModal from './modals/TaskEditorModal';
import useZenDoState from './useZenDoState';
import { DAY_ORDER } from './constants';
import { flattenTasks, getSubtaskProgress, sortTasksByDueDate } from './taskUtils';
import { writeGlobalGistSettings } from '../../state/globalGistSettings';
import { DragProvider } from './drag/DragContext';
import DragPreview from './components/DragPreview';

const VIEW_TABS = [
  { id: 'landing', label: 'Landing' },
  { id: 'today', label: 'Today' },
  { id: 'focus', label: 'Focus' },
  { id: 'garden', label: 'Garden' },
  { id: 'archive', label: 'Archive' },
];

const ZenDoApp = ({ onBack }) => {
  const [currentView, setCurrentView] = useState('landing');
  const [now, setNow] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editorState, setEditorState] = useState({ open: false, mode: 'create', task: null, parentId: null, parentTitle: '' });
  const zenAppShellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const gardenAssignments = useMemo(() => {
    const priority = [];
    const bonus = [];

    const computeStageMetadata = (task) => {
      const { total, completed } = getSubtaskProgress(task);
      const totalStages = Math.max(1, total + 1);
      const completedStages = Math.min(totalStages, completed + (task.completed ? 1 : 0));
      return {
        totalStages,
        completedStages,
        remainingStages: totalStages - completedStages,
        subtaskTotal: total,
        subtaskCompleted: completed,
        progress: completedStages / totalStages,
        isComplete: completedStages >= totalStages,
      };
    };

    const addEntry = (task, bucket, isSnapshot) => {
      if (bucket !== 'priority' && bucket !== 'bonus') {
        return;
      }
      const entry = {
        id: task.id,
        title: task.title,
        description: task.description,
        task,
        bucket,
        isSnapshot,
        snapshot: isSnapshot ? task.gardenSnapshot : null,
        completedAt: isSnapshot ? task.gardenSnapshot?.completedAt || null : null,
        order: !isSnapshot ? (task.schedule?.focusOrder || 0) : null,
        stage: computeStageMetadata(task),
      };

      if (bucket === 'priority') {
        priority.push(entry);
      } else {
        bonus.push(entry);
      }
    };

    const isSameCalendarDay = (first, second) => (
      first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate()
    );

    const traverse = (list) => {
      if (!Array.isArray(list)) {
        return;
      }
      list.forEach((task) => {
        if (!task) return;

        const focusBucket = task.schedule?.focusBucket || null;
        const scheduleDay = task.schedule?.day || null;
        if (!task.completed && (focusBucket === 'priority' || focusBucket === 'bonus') && scheduleDay === todayKey) {
          addEntry(task, focusBucket, false);
        }

        const snapshot = task.gardenSnapshot;
        if (task.completed && snapshot?.bucket && snapshot?.dayKey === todayKey) {
          const completedAt = snapshot.completedAt ? new Date(snapshot.completedAt) : null;
          if (completedAt && !Number.isNaN(completedAt.getTime()) && isSameCalendarDay(completedAt, now)) {
            addEntry(task, snapshot.bucket, true);
          }
        }

        if (task.subtasks?.length) {
          traverse(task.subtasks);
        }
      });
    };

    traverse(tasks);

    const sortEntries = (entries) => entries.sort((a, b) => {
      if (a.isSnapshot !== b.isSnapshot) {
        return a.isSnapshot ? 1 : -1;
      }
      if (a.isSnapshot && b.isSnapshot) {
        const aTime = a.completedAt || '';
        const bTime = b.completedAt || '';
        return bTime.localeCompare(aTime);
      }
      const aOrder = typeof a.order === 'number' ? a.order : 0;
      const bOrder = typeof b.order === 'number' ? b.order : 0;
      return aOrder - bOrder;
    });

    sortEntries(priority);
    sortEntries(bonus);

    return { priority, bonus };
  }, [now, tasks, todayKey]);

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

  const handleUnarchiveTask = useCallback((taskId) => {
    completeTask(taskId, false);
  }, [completeTask]);

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
    } else if (tabId === 'garden') {
      setCurrentView('garden');
    } else if (tabId === 'archive') {
      setCurrentView('archive');
    } else {
      setCurrentView('landing');
    }
  };

  const gistFilename = gistConfig.filename || 'zen-do-data.json';

  useEffect(() => {
    const shellElement = zenAppShellRef.current;
    if (!shellElement) {
      return () => {};
    }

    const editableSelector = 'input, textarea, select, [contenteditable]';

    const resolveElement = (node) => {
      if (!node) return null;
      if (typeof node.closest === 'function') {
        return node;
      }
      if (node.parentElement) {
        return node.parentElement;
      }
      return null;
    };

    const isEventFromEditable = (node) => {
      const element = resolveElement(node);
      if (!element) return false;
      if (typeof element.closest === 'function' && element.closest(editableSelector)) {
        return true;
      }
      return Boolean(element.isContentEditable);
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!event.key || event.key.toLowerCase() !== 'z') return;

      const target = resolveElement(event.target);
      if (isEventFromEditable(target) || isEventFromEditable(document.activeElement)) {
        return;
      }

      if (document.fullscreenElement === shellElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } else if (shellElement.requestFullscreen) {
        shellElement.requestFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <DragProvider>
      <div
        className={`zen-app-shell${isFullscreen ? ' is-fullscreen' : ''}`}
        ref={zenAppShellRef}
      >
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

        {currentView === 'garden' && (
          <GardenView
            priority={gardenAssignments.priority}
            bonus={gardenAssignments.bonus}
          />
        )}

        {currentView === 'archive' && (
          <ArchiveView
            completedTasks={completedTasks}
            onBackToLanding={() => setCurrentView('landing')}
            onDeleteTask={handleDeleteTask}
            onUnarchiveTask={handleUnarchiveTask}
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
      <DragPreview />
    </DragProvider>
  );
};

export default ZenDoApp;
