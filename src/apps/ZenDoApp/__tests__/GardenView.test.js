import React from 'react';
import { render, screen } from '@testing-library/react';
import GardenView from '../views/GardenView';

describe('GardenView', () => {
  const createEntry = (overrides = {}) => ({
    id: 'task-1',
    title: 'Grow a sapling',
    description: 'Daily watering routine',
    bucket: 'priority',
    isSnapshot: false,
    snapshot: null,
    completedAt: null,
    order: 0,
    stage: {
      completedStages: 1,
      totalStages: 3,
      remainingStages: 2,
      subtaskTotal: 2,
      subtaskCompleted: 1,
      progress: 0.33,
      isComplete: false,
    },
    ...overrides,
  });

  it('renders stage progress so seedlings grow with each completed subtask', () => {
    const entry = createEntry({
      id: 'priority-seedling',
      title: 'Morning priority',
      stage: {
        completedStages: 2,
        totalStages: 4,
        remainingStages: 2,
        subtaskTotal: 3,
        subtaskCompleted: 1,
        progress: 0.5,
        isComplete: false,
      },
    });

    render(<GardenView priority={[entry]} bonus={[]} />);

    expect(screen.getByRole('heading', { name: 'Priority Trees' })).toBeInTheDocument();
    expect(screen.getByText('Morning priority')).toBeInTheDocument();
    expect(screen.getByText('Stage 2 / 4')).toBeInTheDocument();
  });

  it('labels completed focus snapshots as persisted for the current day', () => {
    const snapshotEntry = createEntry({
      id: 'bonus-bloom',
      title: 'Finished bonus bloom',
      bucket: 'bonus',
      isSnapshot: true,
      completedAt: '2024-02-01T12:00:00.000Z',
      stage: {
        completedStages: 3,
        totalStages: 3,
        remainingStages: 0,
        subtaskTotal: 2,
        subtaskCompleted: 2,
        progress: 1,
        isComplete: true,
      },
    });

    render(<GardenView priority={[]} bonus={[snapshotEntry]} />);

    expect(screen.getByRole('heading', { name: 'Bonus Bushes' })).toBeInTheDocument();
    expect(screen.getByText('Finished bonus bloom')).toBeInTheDocument();
    expect(screen.getByText('Persisted')).toBeInTheDocument();
    expect(screen.getByText('Stage 3 / 3')).toBeInTheDocument();
  });

  it('announces empty buckets with readable fallback copy', () => {
    render(<GardenView priority={[]} bonus={[]} />);

    const hints = screen.getAllByText('Nothing planted yet.');
    expect(hints).toHaveLength(2);
  });
});
