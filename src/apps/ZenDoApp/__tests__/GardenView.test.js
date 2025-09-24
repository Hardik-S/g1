import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

    expect(screen.getByRole('heading', { name: 'Priority Canopy' })).toBeInTheDocument();
    expect(screen.getByText('Morning priority')).toBeInTheDocument();
    expect(screen.getByText('Morning priority canopy growth stage 3 of 4')).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { name: /Bonus Wildflowers/ })).toBeInTheDocument();
    const flowerButton = screen.getByRole('button', { name: /Finished bonus bloom/i });
    expect(flowerButton).toHaveAccessibleName(
      'Finished bonus bloom. Wildflower stage 3 of 3. Wildflower complete. Carried forward on the trail.',
    );

    fireEvent.focus(flowerButton);

    expect(screen.getByText('Finished bonus bloom')).toBeInTheDocument();
    const popover = screen.getByRole('tooltip');
    expect(within(popover).getByText('Carried forward wildflower')).toBeInTheDocument();
    expect(within(popover).getByText('Wildflower complete')).toBeInTheDocument();
  });

  it('announces empty buckets with readable fallback copy', () => {
    render(<GardenView priority={[]} bonus={[]} />);

    const callout = screen.getByRole('status');
    expect(callout).toHaveTextContent(
      'Assign focus tasks to cultivate the canopy and light up the wildflower trail.',
    );
  });
});
