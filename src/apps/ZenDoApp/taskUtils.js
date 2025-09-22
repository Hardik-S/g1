const MAX_DEPTH = 3;

export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `zen-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

const coerceArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeTask = (task, depth = 0) => {
  if (!task || depth > MAX_DEPTH) return null;
  const now = new Date().toISOString();
  const subtasks = coerceArray(task.subtasks)
    .map((child) => normalizeTask(child, depth + 1))
    .filter(Boolean);

  const normalized = {
    id: task.id || generateId(),
    title: task.title || 'Untitled Task',
    description: task.description || '',
    dueDate: task.dueDate || '',
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    completed: Boolean(task.completed),
    completedAt: task.completed ? (task.completedAt || now) : null,
    subtasks,
    schedule: {
      day: task.schedule?.day || null,
      order: typeof task.schedule?.order === 'number' ? task.schedule.order : 0,
      focusBucket: task.schedule?.focusBucket || null,
      focusOrder:
        typeof task.schedule?.focusOrder === 'number' ? task.schedule.focusOrder : 0,
    },
  };

  return recalculateCompletion(normalized);
};

export const normalizeTaskCollection = (tasks) => coerceArray(tasks)
  .map((task) => normalizeTask(task, 0))
  .filter(Boolean);

export const cloneTask = (task) => JSON.parse(JSON.stringify(task));

const updateTaskTimestamps = (task, touch = true) => ({
  ...task,
  updatedAt: touch ? new Date().toISOString() : task.updatedAt,
});

const withUpdatedTask = (task, updater, depth = 0) => {
  if (!task) return task;
  const next = updater(task, depth) || task;
  const touched = updateTaskTimestamps(next, next !== task);
  const subtasks = coerceArray(touched.subtasks).map((child) => withUpdatedTask(child, (sub) => sub, depth + 1));
  const recomputed = { ...touched, subtasks };
  return recalculateCompletion(recomputed);
};

const updateTaskInTree = (tasks, taskId, updater, depth = 0) => {
  let changed = false;
  const nextTasks = coerceArray(tasks).map((task) => {
    if (task.id === taskId) {
      changed = true;
      const updated = withUpdatedTask(task, (current) => updater(cloneTask(current), depth));
      return updated;
    }
    if (task.subtasks?.length) {
      const childResult = updateTaskInTree(task.subtasks, taskId, updater, depth + 1);
      if (childResult !== task.subtasks) {
        changed = true;
        const updatedParent = {
          ...task,
          subtasks: childResult,
        };
        return recalculateCompletion(updateTaskTimestamps(updatedParent));
      }
    }
    return task;
  });
  return changed ? nextTasks : tasks;
};

const removeTaskFromTree = (tasks, taskId) => {
  let changed = false;
  const filtered = coerceArray(tasks)
    .map((task) => {
      if (task.id === taskId) {
        changed = true;
        return null;
      }
      if (task.subtasks?.length) {
        const nextSubtasks = removeTaskFromTree(task.subtasks, taskId);
        if (nextSubtasks !== task.subtasks) {
          changed = true;
          const updated = {
            ...task,
            subtasks: nextSubtasks,
          };
          return recalculateCompletion(updated);
        }
      }
      return task;
    })
    .filter(Boolean);
  return changed ? filtered : tasks;
};

export const upsertTask = (tasks, task, parentId = null) => {
  const normalized = normalizeTask(task);
  if (!normalized) return tasks;

  if (!parentId) {
    return [...coerceArray(tasks), normalized];
  }

  let inserted = false;
  const nextTasks = coerceArray(tasks).map((candidate) => {
    if (candidate.id === parentId) {
      inserted = true;
      const updated = {
        ...candidate,
        subtasks: [...coerceArray(candidate.subtasks), normalized],
      };
      return recalculateCompletion(updateTaskTimestamps(updated));
    }
    if (candidate.subtasks?.length) {
      const nextSubtasks = upsertTask(candidate.subtasks, normalized, parentId);
      if (nextSubtasks !== candidate.subtasks) {
        inserted = true;
        const updated = {
          ...candidate,
          subtasks: nextSubtasks,
        };
        return recalculateCompletion(updateTaskTimestamps(updated));
      }
    }
    return candidate;
  });

  if (!inserted) {
    return tasks;
  }
  return nextTasks;
};

export const insertTaskAtPosition = (tasks, task, parentId = null, index = null) => {
  const normalized = normalizeTask(task);
  if (!normalized) return tasks;
  const targetIndex = typeof index === 'number' ? index : undefined;

  if (!parentId) {
    const list = [...coerceArray(tasks)];
    if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= list.length) {
      list.splice(targetIndex, 0, normalized);
      return list;
    }
    list.push(normalized);
    return list;
  }

  const nextTasks = coerceArray(tasks).map((candidate) => {
    if (candidate.id === parentId) {
      const nextSubtasks = [...coerceArray(candidate.subtasks)];
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= nextSubtasks.length) {
        nextSubtasks.splice(targetIndex, 0, normalized);
      } else {
        nextSubtasks.push(normalized);
      }
      const updated = {
        ...candidate,
        subtasks: nextSubtasks,
      };
      return recalculateCompletion(updateTaskTimestamps(updated));
    }
    if (candidate.subtasks?.length) {
      const nested = insertTaskAtPosition(candidate.subtasks, normalized, parentId, targetIndex);
      if (nested !== candidate.subtasks) {
        const updated = {
          ...candidate,
          subtasks: nested,
        };
        return recalculateCompletion(updateTaskTimestamps(updated));
      }
    }
    return candidate;
  });
  return nextTasks;
};

export const updateTask = (tasks, taskId, updater) => updateTaskInTree(tasks, taskId, updater);

export const deleteTask = (tasks, taskId) => removeTaskFromTree(tasks, taskId);

export const flattenTasks = (tasks, includeCompleted = true) => {
  const result = [];
  const traverse = (list, depth = 0, parent = null) => {
    coerceArray(list).forEach((task) => {
      if (includeCompleted || !task.completed) {
        result.push({ task, depth, parent });
      }
      if (task.subtasks?.length) {
        traverse(task.subtasks, depth + 1, task);
      }
    });
  };
  traverse(tasks);
  return result;
};

export const sortTasksByDueDate = (tasks) => {
  const copy = [...coerceArray(tasks)];
  copy.sort((a, b) => {
    const aDue = a.dueDate ? Date.parse(a.dueDate) || Infinity : Infinity;
    const bDue = b.dueDate ? Date.parse(b.dueDate) || Infinity : Infinity;
    if (aDue !== bDue) {
      return aDue - bDue;
    }
    const aCreated = Date.parse(a.createdAt || 0) || 0;
    const bCreated = Date.parse(b.createdAt || 0) || 0;
    return aCreated - bCreated;
  });
  return copy.map((task) => ({
    ...task,
    subtasks: sortTasksByDueDate(task.subtasks || []),
  }));
};

export const toggleTaskCompletion = (tasks, taskId, completed = null) => {
  return updateTask(tasks, taskId, (task) => {
    const desired = completed === null ? !task.completed : completed;
    const now = new Date().toISOString();
    const toggled = {
      ...task,
      completed: desired,
      completedAt: desired ? now : null,
      schedule: desired ? {
        day: null,
        order: 0,
        focusBucket: null,
        focusOrder: 0,
      } : task.schedule,
      subtasks: coerceArray(task.subtasks).map((child) => ({
        ...child,
        completed: desired ? true : child.completed,
        completedAt: desired ? now : child.completedAt,
        schedule: desired ? {
          day: null,
          order: 0,
          focusBucket: null,
          focusOrder: 0,
        } : child.schedule,
        subtasks: child.subtasks,
      })),
    };
    return toggled;
  });
};

export const markSubtaskCompletionCascade = (tasks) => {
  return normalizeTaskCollection(tasks);
};

const cascadeRecalculate = (task) => {
  const updatedSubtasks = coerceArray(task.subtasks).map(cascadeRecalculate);
  return recalculateCompletion({
    ...task,
    subtasks: updatedSubtasks,
  });
};

export const recalculateTaskTree = (tasks) => coerceArray(tasks).map(cascadeRecalculate);

export const assignTaskToDay = (tasks, taskId, dayKey, order = 0) => {
  return updateTask(tasks, taskId, (task) => ({
    ...task,
    schedule: {
      ...task.schedule,
      day: dayKey,
      order,
      focusBucket: dayKey === task.schedule?.day ? task.schedule.focusBucket : null,
      focusOrder: dayKey === task.schedule?.day ? task.schedule.focusOrder : 0,
    },
  }));
};

export const reorderDayAssignments = (tasks, dayKey, orderedIds) => {
  const idToIndex = new Map(orderedIds.map((id, index) => [id, index]));
  return recalculateTaskTree(coerceArray(tasks).map((task) => {
    if (task.schedule?.day === dayKey && idToIndex.has(task.id)) {
      return {
        ...task,
        schedule: {
          ...task.schedule,
          order: idToIndex.get(task.id),
        },
      };
    }
    if (task.subtasks?.length) {
      return {
        ...task,
        subtasks: reorderDayAssignments(task.subtasks, dayKey, orderedIds),
      };
    }
    return task;
  }));
};

export const assignFocusBucket = (tasks, taskId, bucket, order = 0) => {
  return updateTask(tasks, taskId, (task) => ({
    ...task,
    schedule: {
      ...task.schedule,
      focusBucket: bucket,
      focusOrder: order,
    },
  }));
};

export const reorderFocusBucket = (tasks, bucket, orderedIds) => {
  const idToIndex = new Map(orderedIds.map((id, index) => [id, index]));
  return recalculateTaskTree(coerceArray(tasks).map((task) => {
    if (task.schedule?.focusBucket === bucket && idToIndex.has(task.id)) {
      return {
        ...task,
        schedule: {
          ...task.schedule,
          focusOrder: idToIndex.get(task.id),
        },
      };
    }
    if (task.subtasks?.length) {
      return {
        ...task,
        subtasks: reorderFocusBucket(task.subtasks, bucket, orderedIds),
      };
    }
    return task;
  }));
};

export const removeFocusBucket = (tasks, taskId) => {
  return updateTask(tasks, taskId, (task) => ({
    ...task,
    schedule: {
      ...task.schedule,
      focusBucket: null,
      focusOrder: 0,
    },
  }));
};

export const removeDayAssignment = (tasks, taskId) => {
  return updateTask(tasks, taskId, (task) => ({
    ...task,
    schedule: {
      ...task.schedule,
      day: null,
      order: 0,
      focusBucket: null,
      focusOrder: 0,
    },
  }));
};

export const recalculateCompletion = (task) => {
  if (!task) return task;
  const subtasks = coerceArray(task.subtasks).map(recalculateCompletion);
  const allSubtasksDone = subtasks.length > 0 && subtasks.every((sub) => sub.completed);
  const manualEligible = subtasks.length === 0
    ? task.completed
    : (task.completed && subtasks.every((sub) => sub.completed));
  const completed = allSubtasksDone || manualEligible;
  return {
    ...task,
    subtasks,
    completed,
    completedAt: completed ? (task.completedAt || new Date().toISOString()) : null,
  };
};

export const trimTaskToDepth = (task, depth = 0) => {
  if (depth >= MAX_DEPTH) {
    return {
      ...task,
      subtasks: [],
    };
  }
  return {
    ...task,
    subtasks: coerceArray(task.subtasks).map((sub) => trimTaskToDepth(sub, depth + 1)),
  };
};

export const MAX_TASK_DEPTH = MAX_DEPTH;
