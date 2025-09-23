import {
  assignFocusBucket,
  assignTaskToDay,
  getSubtaskProgress,
  toggleTaskCompletion,
} from '../taskUtils';

describe('ZenDo task scheduling helpers', () => {
  it('assignFocusBucket handles null schedule while updating focus metadata', () => {
    const tasks = [
      {
        id: 't-1',
        title: 'Legacy task',
        schedule: null,
      },
    ];

    const [updated] = assignFocusBucket(tasks, 't-1', 'deepWork', 3);

    expect(updated.schedule).toEqual({
      day: null,
      order: 0,
      focusBucket: 'deepWork',
      focusOrder: 3,
    });
  });

  it('assignTaskToDay handles null schedule while preserving focus defaults', () => {
    const tasks = [
      {
        id: 't-2',
        title: 'Legacy task',
        schedule: null,
      },
    ];

    const [updated] = assignTaskToDay(tasks, 't-2', 'monday', 1);

    expect(updated.schedule).toEqual({
      day: 'monday',
      order: 1,
      focusBucket: null,
      focusOrder: 0,
    });
  });
});

describe('toggleTaskCompletion garden snapshots', () => {
  it('records schedule details when marking a task complete', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-04-01T12:00:00.000Z'));
    try {
      const tasks = [
        {
          id: 'snapshot',
          title: 'Snapshot me',
          schedule: {
            day: 'monday',
            order: 2,
            focusBucket: 'deepWork',
            focusOrder: 4,
          },
          subtasks: [
            {
              id: 'child-1',
              title: 'Child task',
              schedule: {
                day: 'tuesday',
                order: 1,
                focusBucket: 'maintenance',
                focusOrder: 0,
              },
            },
          ],
        },
      ];

      const [updated] = toggleTaskCompletion(tasks, 'snapshot', true);

      expect(updated.completed).toBe(true);
      expect(updated.completedAt).toBe('2024-04-01T12:00:00.000Z');
      expect(updated.gardenSnapshot).toEqual({
        bucket: 'deepWork',
        dayKey: 'monday',
        completedAt: '2024-04-01T12:00:00.000Z',
      });
      expect(updated.schedule).toEqual({
        day: null,
        order: 0,
        focusBucket: null,
        focusOrder: 0,
      });
      expect(updated.subtasks[0].gardenSnapshot).toEqual({
        bucket: 'maintenance',
        dayKey: 'tuesday',
        completedAt: '2024-04-01T12:00:00.000Z',
      });
      expect(updated.subtasks[0].schedule).toEqual({
        day: null,
        order: 0,
        focusBucket: null,
        focusOrder: 0,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears snapshot when undoing completion', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-04-02T09:30:00.000Z'));
    try {
      const tasks = [
        {
          id: 'snapshot',
          title: 'Snapshot me',
          completed: true,
          completedAt: '2024-04-01T08:00:00.000Z',
          schedule: {
            day: null,
            order: 0,
            focusBucket: null,
            focusOrder: 0,
          },
          gardenSnapshot: {
            bucket: 'deepWork',
            dayKey: 'monday',
            completedAt: '2024-04-01T08:00:00.000Z',
          },
        },
      ];

      const [updated] = toggleTaskCompletion(tasks, 'snapshot', false);

      expect(updated.completed).toBe(false);
      expect(updated.completedAt).toBeNull();
      expect(updated.gardenSnapshot).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('getSubtaskProgress', () => {
  it('reports totals and completions across nested subtasks', () => {
    const task = {
      id: 'parent',
      subtasks: [
        {
          id: 'child-1',
          completed: true,
          subtasks: [
            { id: 'grand-1', completed: true },
            { id: 'grand-2', completed: false },
          ],
        },
        {
          id: 'child-2',
          completed: false,
        },
      ],
    };

    expect(getSubtaskProgress(task)).toEqual({ total: 4, completed: 2 });
  });

  it('returns zeroed progress when no subtasks exist', () => {
    expect(getSubtaskProgress({ id: 'solo' })).toEqual({ total: 0, completed: 0 });
    expect(getSubtaskProgress(null)).toEqual({ total: 0, completed: 0 });
  });
});
