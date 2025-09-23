# Zen Do Drag & Scheduling Reference

## Drag controller architecture
- The landing view wires SortableJS to the root task tree and each weekly bucket. The task tree runs in clone-only mode so dragging a root task only spawns a preview while the source list stays untouched, and bucket containers accept both clones and reorders to persist assignments (see `views/LandingView.js`).
- Today view builds three independent Sortable instances: one for the Today staging list that clears focus metadata on drop, and one for each Focus bucket that persists assignments and reorders within their columns. All controllers share the `zen-today` group to allow cross-column moves while maintaining clone behaviour (see `views/TodayView.js`).

## Preview overlay handling
- Each Sortable instance opts into `fallbackOnBody` so pointer and touch drags render a floating ghost element anchored to the document body, which keeps long columns from clipping the preview.
- Drag callbacks explicitly remove Sortable’s clones or placeholder nodes after a drop completes. Landing view prunes clones spawned from the task tree and weekly buckets, while Today view shares a `discardSortableClone` helper to clean up whichever element Sortable created for the gesture.

## Data callback lifecycle
- Weekly drops call `onAssignTaskToDay` with the task id, target day, and position, then immediately compute the new DOM order so `onReorderDay` persists the schedule indices. Today view mirrors this by invoking `onAssignToBucket`, `onReorderBucket`, and `onClearBucket` depending on the drop target.
- `ZenDoApp` wires those callbacks to state helpers from `useZenDoState`, which in turn delegate to the scheduling utilities. `placeTaskInDay`, `reorderDay`, `placeInFocusBucket`, `reorderFocus`, and `clearFocus` wrap the drag payload in reducer-friendly mutations before persisting.
- The utilities coerce schedules to a normalized shape so moving a task between days clears old focus assignments, and moving between focus buckets preserves order indexes per container. This logic lives in `assignTaskToDay`, `reorderDayAssignments`, `assignFocusBucket`, `reorderFocusBucket`, `removeFocusBucket`, and `removeDayAssignment` in `taskUtils.js`.

## Manual QA checklist
1. **Weekly planning drag loop** – With a mouse or touchpad, drag a root task from *All Tasks* into a weekly bucket and back again. Confirm the source list still contains the item (clone-only pull) and the bucket cards reorder to match the drop position.
2. **Today view promotions** – Drag a card from a weekly bucket into the Today column, then into Priority/Bonus. Verify the ghost preview tracks the pointer, the target column reorders correctly, and leaving the Today list clears any prior focus bucket metadata.
3. **Keyboard fallback** – Use Tab/Shift+Tab to reach the “+ New Task” button, press Enter to launch the editor, and save a task. Expand/collapse it with the toggle buttons and mark it complete via the checkbox to confirm core flows remain accessible without drag gestures.
4. **Touch and clone cleanup** – On a touch device or emulator, flick a task between buckets and ensure the preview disappears after release without leaving orphaned DOM nodes or duplicate cards. The cleanup hooks in both views remove Sortable’s clones post-drop.
5. **State regression guardrails** – After moving tasks across days and focus buckets, reload the app to confirm schedules persist via the normalized task utilities. The Jest suite covers null schedule migrations for both day assignments and focus buckets; run `npm test -- src/apps/ZenDoApp/__tests__/taskUtils.test.js` to verify.
