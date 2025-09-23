import { assignFocusBucket, assignTaskToDay } from '../taskUtils';

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
