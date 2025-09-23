# Zen Do Drag & Scheduling Reference

## Drag controller architecture
- The landing view relies on the shared `DragContext` hook. `TaskTree` kicks off pointer-based drags via `beginDrag`, while each weekly bucket listens for pointer movement and feeds hover metadata back through `setHoverTarget`. Drops resolve through the context-aware `onDrop` handler to keep `dayAssignments` in sync (see `views/LandingView.js`).
- Today view uses a lightweight HTML Drag and Drop wrapper. `useSharedDragController` tracks the active card, placeholder index, and hovered bucket so `DroppableBucket` can render insertion hints and fire `onDrop` payloads with normalized indices (see `views/TodayView.js`).

## Preview overlay handling
- `DragPreview` renders a portal-based floating card that mirrors the pointer position supplied by the `DragContext`. Pointer offsets keep the preview aligned with the cursor or touch start, preventing clipping in tall columns.
- `DroppableBucket` owns placeholder rendering and clears hover state when the pointer leaves a bucket. Because we control the DOM directly, no extra clone cleanup is required—cards are filtered from their source list until the drop is committed.

## Data callback lifecycle
- Weekly drops call `onAssignTaskToDay` with the task id, target day, and position, then immediately compute the new DOM order so `onReorderDay` persists the schedule indices. Today view mirrors this by invoking `onAssignToBucket`, `onReorderBucket`, and `onClearBucket` depending on the drop target.
- `ZenDoApp` wires those callbacks to state helpers from `useZenDoState`, which in turn delegate to the scheduling utilities. `placeTaskInDay`, `reorderDay`, `placeInFocusBucket`, `reorderFocus`, and `clearFocus` wrap the drag payload in reducer-friendly mutations before persisting.
- The utilities coerce schedules to a normalized shape so moving a task between days clears old focus assignments, and moving between focus buckets preserves order indexes per container. This logic lives in `assignTaskToDay`, `reorderDayAssignments`, `assignFocusBucket`, `reorderFocusBucket`, `removeFocusBucket`, and `removeDayAssignment` in `taskUtils.js`.

## Manual QA checklist
1. **Weekly planning drag loop** – With a mouse or touchpad, drag a root task from *All Tasks* into a weekly bucket and back again. Confirm the source list still contains the item and the bucket cards reorder to match the drop position supplied by the hover index.
2. **Today view promotions** – Drag a card from a weekly bucket into the Today column, then into Priority/Bonus. Verify the placeholder tracks the pointer, the target column reorders correctly, and leaving the Today list clears any prior focus bucket metadata.
3. **Keyboard fallback** – Use Tab/Shift+Tab to reach the “+ New Task” button, press Enter to launch the editor, and save a task. Expand/collapse it with the toggle buttons and mark it complete via the checkbox to confirm core flows remain accessible without drag gestures.
4. **Touch responsiveness** – On a touch device or emulator, flick a task between buckets and ensure the preview disappears after release without leaving orphaned DOM nodes or duplicate cards. The shared controllers reset hover state and drag snapshots on pointer cancel events.
5. **State regression guardrails** – After moving tasks across days and focus buckets, reload the app to confirm schedules persist via the normalized task utilities. The Jest suite covers null schedule migrations for both day assignments and focus buckets; run `npm test -- src/apps/ZenDoApp/__tests__/taskUtils.test.js` to verify.
