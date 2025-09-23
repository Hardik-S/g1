import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import TodayView from '../views/TodayView';

describe('TodayView drag and drop behaviour', () => {
  const baseProps = {
    onClearBucket: jest.fn(),
    onBackToLanding: jest.fn(),
    onOpenFocus: jest.fn(),
  };

  const createDataTransfer = () => {
    const store = {};
    return {
      setData: (key, value) => {
        store[key] = value;
      },
      getData: (key) => store[key],
      setDragImage: () => {},
      effectAllowed: 'move',
      dropEffect: 'move',
    };
  };

  const applyVerticalRects = (elements) => {
    elements.forEach((element, index) => {
      element.getBoundingClientRect = () => ({
        top: index * 100,
        bottom: index * 100 + 100,
        left: 0,
        right: 200,
        height: 100,
        width: 200,
        x: 0,
        y: index * 100,
        toJSON: () => {},
      });
    });
  };

  const withClientY = (event, value) => {
    Object.defineProperty(event, 'clientY', {
      configurable: true,
      value,
    });
    return event;
  };

  it('drops tasks from Today into Priority and Bonus buckets with accurate payloads', () => {
    const onAssignToBucket = jest.fn();
    const onReorderBucket = jest.fn();

    const { rerender } = render(
      <TodayView
        {...baseProps}
        todayList={[
          { id: 'task-1', title: 'First task', completed: false },
          { id: 'task-2', title: 'Second task', completed: false },
        ]}
        priorityList={[{ id: 'priority-existing', title: 'Priority existing', completed: false }]}
        bonusList={[
          { id: 'bonus-top', title: 'Bonus top', completed: false },
          { id: 'bonus-bottom', title: 'Bonus bottom', completed: false },
        ]}
        onAssignToBucket={onAssignToBucket}
        onReorderBucket={onReorderBucket}
      />
    );

    const priorityBucket = screen.getByTestId('priority-drop-zone');
    applyVerticalRects(priorityBucket.querySelectorAll('[data-task-id]'));

    const draggableToday = screen.getByText('First task').closest('[draggable="true"]');
    expect(draggableToday).not.toBeNull();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(draggableToday, { dataTransfer });

    const dragEnterPriority = withClientY(createEvent.dragEnter(priorityBucket, { dataTransfer }), 250);
    fireEvent(priorityBucket, dragEnterPriority);

    const dragOverPriority = withClientY(createEvent.dragOver(priorityBucket, { dataTransfer }), 250);
    fireEvent(priorityBucket, dragOverPriority);

    const placeholder = screen.getByTestId('drag-placeholder');
    const placeholderOver = withClientY(createEvent.dragOver(placeholder, { dataTransfer }), 250);
    fireEvent(placeholder, placeholderOver);

    const placeholderDrop = createEvent.drop(placeholder, { dataTransfer });
    fireEvent(placeholder, placeholderDrop);

    expect(onAssignToBucket).toHaveBeenNthCalledWith(1, 'task-1', 'priority', 1);
    expect(onReorderBucket).toHaveBeenNthCalledWith(1, 'priority', ['priority-existing', 'task-1']);
    expect(onReorderBucket).toHaveBeenNthCalledWith(2, 'today', ['task-2']);

    rerender(
      <TodayView
        {...baseProps}
        todayList={[{ id: 'task-2', title: 'Second task', completed: false }]}
        priorityList={[
          { id: 'priority-existing', title: 'Priority existing', completed: false },
          { id: 'task-1', title: 'First task', completed: false },
        ]}
        bonusList={[
          { id: 'bonus-top', title: 'Bonus top', completed: false },
          { id: 'bonus-bottom', title: 'Bonus bottom', completed: false },
        ]}
        onAssignToBucket={onAssignToBucket}
        onReorderBucket={onReorderBucket}
      />
    );

    const bonusBucket = screen.getByTestId('bonus-drop-zone');
    applyVerticalRects(bonusBucket.querySelectorAll('[data-task-id]'));

    const draggableSecond = screen.getByText('Second task').closest('[draggable="true"]');
    expect(draggableSecond).not.toBeNull();

    const dataTransferSecond = createDataTransfer();
    fireEvent.dragStart(draggableSecond, { dataTransfer: dataTransferSecond });

    const dragEnterBonus = withClientY(createEvent.dragEnter(bonusBucket, { dataTransfer: dataTransferSecond }), 120);
    fireEvent(bonusBucket, dragEnterBonus);

    const dragOverBonus = withClientY(createEvent.dragOver(bonusBucket, { dataTransfer: dataTransferSecond }), 120);
    fireEvent(bonusBucket, dragOverBonus);

    const bonusPlaceholder = screen.getByTestId('drag-placeholder');
    const bonusPlaceholderOver = withClientY(
      createEvent.dragOver(bonusPlaceholder, { dataTransfer: dataTransferSecond }),
      120,
    );
    fireEvent(bonusPlaceholder, bonusPlaceholderOver);

    const bonusDropEvent = createEvent.drop(bonusPlaceholder, { dataTransfer: dataTransferSecond });
    fireEvent(bonusPlaceholder, bonusDropEvent);

    expect(onAssignToBucket).toHaveBeenNthCalledWith(2, 'task-2', 'bonus', 1);
    expect(onReorderBucket).toHaveBeenNthCalledWith(3, 'bonus', ['bonus-top', 'task-2', 'bonus-bottom']);
    expect(onReorderBucket).toHaveBeenNthCalledWith(4, 'today', []);
  });
});
