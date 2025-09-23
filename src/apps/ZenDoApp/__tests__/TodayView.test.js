import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TodayView from '../views/TodayView';

const createTask = (id, title, overrides = {}) => ({
  id,
  title,
  completed: false,
  ...overrides,
});

const createDataTransfer = () => {
  const store = {};
  return {
    setData: jest.fn((key, value) => {
      store[key] = value;
    }),
    getData: jest.fn((key) => store[key]),
    effectAllowed: 'move',
    dropEffect: 'move',
  };
};

const mockBoundingRects = (container) => {
  const nodes = container.querySelectorAll('[data-task-id]');
  nodes.forEach((node, index) => {
    Object.defineProperty(node, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: index * 60,
        bottom: index * 60 + 60,
        height: 60,
        width: 240,
        left: 0,
        right: 240,
      }),
    });
  });
};

describe('TodayView drag-and-drop', () => {
  it('moves a task from priority to today and triggers callbacks once', () => {
    const onAssignToBucket = jest.fn();
    const onReorderBucket = jest.fn();
    const onClearBucket = jest.fn();
    const noop = jest.fn();
    render(
      <TodayView
        todayList={[createTask('t-1', 'Today Task')]}
        priorityList={[createTask('p-1', 'Priority Task')]}
        bonusList={[]}
        onAssignToBucket={onAssignToBucket}
        onReorderBucket={onReorderBucket}
        onClearBucket={onClearBucket}
        onBackToLanding={noop}
        onOpenFocus={noop}
        onCompleteTask={noop}
      />,
    );

    const priorityZone = screen.getByTestId('priority-drop-zone');
    const todayZone = screen.getByTestId('today-drop-zone');
    mockBoundingRects(priorityZone);
    mockBoundingRects(todayZone);

    const priorityCard = within(priorityZone).getByText('Priority Task');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(priorityCard, { dataTransfer });

    expect(priorityZone.querySelector('[data-placeholder="true"]')).toBeInTheDocument();

    fireEvent.dragEnter(todayZone, { clientY: 10, dataTransfer });
    mockBoundingRects(todayZone);
    fireEvent.dragOver(todayZone, { clientY: 10, dataTransfer });

    expect(todayZone.querySelector('[data-placeholder="true"]')).toBeInTheDocument();

    fireEvent.drop(todayZone, { clientY: 10, dataTransfer });
    fireEvent.dragEnd(priorityCard, { dataTransfer });

    expect(onClearBucket).toHaveBeenCalledTimes(1);
    expect(onClearBucket).toHaveBeenCalledWith('p-1');
    expect(onAssignToBucket).not.toHaveBeenCalled();

    expect(onReorderBucket).toHaveBeenCalledTimes(2);
    expect(onReorderBucket).toHaveBeenNthCalledWith(1, 'today', ['p-1', 't-1']);
    expect(onReorderBucket).toHaveBeenNthCalledWith(2, 'priority', []);

    expect(priorityZone.querySelector('[data-placeholder="true"]')).not.toBeInTheDocument();
    expect(todayZone.querySelector('[data-placeholder="true"]')).not.toBeInTheDocument();
  });

  it('assigns a task from today to bonus with correct index', () => {
    const onAssignToBucket = jest.fn();
    const onReorderBucket = jest.fn();
    const onClearBucket = jest.fn();
    const noop = jest.fn();
    render(
      <TodayView
        todayList={[createTask('t-1', 'Today One'), createTask('t-2', 'Today Two')]}
        priorityList={[]}
        bonusList={[createTask('b-1', 'Bonus One')]}
        onAssignToBucket={onAssignToBucket}
        onReorderBucket={onReorderBucket}
        onClearBucket={onClearBucket}
        onBackToLanding={noop}
        onOpenFocus={noop}
        onCompleteTask={noop}
      />,
    );

    const todayZone = screen.getByTestId('today-drop-zone');
    const bonusZone = screen.getByTestId('bonus-drop-zone');
    mockBoundingRects(todayZone);
    mockBoundingRects(bonusZone);

    const todayCard = within(todayZone).getByText('Today Two');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(todayCard, { dataTransfer });
    expect(todayZone.querySelector('[data-placeholder="true"]')).toBeInTheDocument();

    fireEvent.dragEnter(bonusZone, { clientY: 10, dataTransfer });
    mockBoundingRects(bonusZone);
    fireEvent.dragOver(bonusZone, { clientY: 10, dataTransfer });

    expect(bonusZone.querySelector('[data-placeholder="true"]')).toBeInTheDocument();

    fireEvent.drop(bonusZone, { clientY: 120, dataTransfer });
    fireEvent.dragEnd(todayCard, { dataTransfer });

    expect(onAssignToBucket).toHaveBeenCalledTimes(1);
    expect(onAssignToBucket).toHaveBeenCalledWith('t-2', 'bonus', 0);
    expect(onClearBucket).not.toHaveBeenCalled();

    expect(onReorderBucket).toHaveBeenCalledTimes(2);
    expect(onReorderBucket).toHaveBeenNthCalledWith(1, 'bonus', ['t-2', 'b-1']);
    expect(onReorderBucket).toHaveBeenNthCalledWith(2, 'today', ['t-1']);

    expect(todayZone.querySelector('[data-placeholder="true"]')).not.toBeInTheDocument();
    expect(bonusZone.querySelector('[data-placeholder="true"]')).not.toBeInTheDocument();
  });
});
