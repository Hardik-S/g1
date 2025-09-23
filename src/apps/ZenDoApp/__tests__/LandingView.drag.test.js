import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import LandingView from '../views/LandingView';
import { DragProvider } from '../drag/DragContext';
import DragPreview from '../components/DragPreview';

const baseTasks = [
  {
    id: 'task-backlog',
    title: 'Backlog Task',
    completed: false,
    subtasks: [],
  },
];

const mondayAssignments = [
  { id: 'task-monday-1', title: 'Existing Monday', completed: false },
  { id: 'task-monday-2', title: 'Second Monday', completed: false },
];

const renderLanding = (overrideProps = {}) => {
  const props = {
    tasks: baseTasks,
    expandedIds: new Set(),
    onToggleExpand: jest.fn(),
    onEditTask: jest.fn(),
    onDeleteTask: jest.fn(),
    onCompleteTask: jest.fn(),
    onAddSubtask: jest.fn(),
    onAddRootTask: jest.fn(),
    dayAssignments: { mon: mondayAssignments, tue: [] },
    onAssignTaskToDay: jest.fn(),
    onReorderDay: jest.fn(),
    onLaunchToday: jest.fn(),
    ...overrideProps,
  };

  const utils = render(
    <DragProvider>
      <>
        <LandingView {...props} />
        <DragPreview />
      </>
    </DragProvider>,
  );

  return { ...utils, props };
};

const setRect = (element, rect) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right ?? rect.left + rect.width,
      bottom: rect.bottom ?? rect.top + rect.height,
    }),
    configurable: true,
  });
};

const emitPointerEvent = (type, init) => {
  const EventCtor = window.PointerEvent || window.MouseEvent;
  const event = new EventCtor(type, { bubbles: true, cancelable: true, ...init });
  window.dispatchEvent(event);
};

const startBacklogDrag = (pointer = { x: 40, y: 20 }) => {
  const row = screen.getByText('Backlog Task').closest('.zen-task-row');
  if (!row) {
    throw new Error('Backlog row not found');
  }
  setRect(row, { left: 0, top: 0, width: 260, height: 64 });
  act(() => {
    fireEvent.pointerDown(row, {
      pointerId: 1,
      clientX: pointer.x,
      clientY: pointer.y,
      button: 0,
    });
  });
  return row;
};

const configureBucketRects = (bucketKey = 'mon') => {
  const bucket = screen.getByTestId(`bucket-${bucketKey}`);
  setRect(bucket, {
    left: 320,
    top: 0,
    width: 260,
    height: 320,
  });
  const cards = bucket.querySelectorAll('[data-task-id]');
  cards.forEach((card, index) => {
    setRect(card, {
      left: 320,
      top: 16 + (index * 72),
      width: 260,
      height: 64,
    });
  });
  return bucket;
};

describe('LandingView drag interactions', () => {
  it('creates a floating preview when starting a backlog drag', () => {
    renderLanding();
    startBacklogDrag();

    const preview = document.body.querySelector('.zen-drag-preview');
    expect(preview).toBeInTheDocument();
    expect(preview?.querySelector('.zen-card-title')).toHaveTextContent('Backlog Task');

    act(() => {
      emitPointerEvent('pointerup', { pointerId: 1, clientX: 50, clientY: 40 });
    });
  });

  it('marks hovered bucket and renders a placeholder during drag', async () => {
    renderLanding();
    startBacklogDrag();
    const bucket = configureBucketRects('mon');

    act(() => {
      emitPointerEvent('pointermove', { pointerId: 1, clientX: 350, clientY: 30 });
    });

    await waitFor(() => expect(bucket).toHaveClass('is-hovered'));
    expect(bucket.querySelector('.zen-week-card.placeholder')).toBeInTheDocument();

    act(() => {
      emitPointerEvent('pointerup', { pointerId: 1, clientX: 350, clientY: 30 });
    });
  });

  it('only invokes assignment callbacks once on drop', async () => {
    const onAssignTaskToDay = jest.fn();
    const onReorderDay = jest.fn();
    renderLanding({ onAssignTaskToDay, onReorderDay });

    startBacklogDrag({ x: 30, y: 18 });
    const bucket = configureBucketRects('mon');

    act(() => {
      emitPointerEvent('pointermove', { pointerId: 1, clientX: 340, clientY: 25 });
    });
    await waitFor(() => expect(bucket).toHaveClass('is-hovered'));

    act(() => {
      emitPointerEvent('pointerup', { pointerId: 1, clientX: 340, clientY: 25 });
    });

    await waitFor(() => expect(onAssignTaskToDay).toHaveBeenCalledTimes(1));
    expect(onAssignTaskToDay).toHaveBeenCalledWith('task-backlog', 'mon', 0);

    expect(onReorderDay).toHaveBeenCalledTimes(1);
    expect(onReorderDay).toHaveBeenCalledWith('mon', [
      'task-backlog',
      'task-monday-1',
      'task-monday-2',
    ]);

    await waitFor(() => expect(bucket).not.toHaveClass('is-hovered'));
  });
});
