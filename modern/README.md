# Modern Surface Notes

This `modern/` directory is a separate, preserved, forward-facing layer for `g1`.

## Old-to-new functionality map

- Original React launcher remains the source of truth at the repo root (`/`).
- Original app routes remain untouched (`/apps/...`, `/cache-lab`).
- Existing stack remains unchanged for legacy runtime behavior (React, webpack, workspace apps).
- This page adds a new discovery-first interface for:
  - Search and category filtering.
  - Favorites and recent launch memory via localStorage.
  - Randomized launch action.
  - Theme toggle and list/grid view modes.
  - Runtime evidence panel for auditability.

## Rebuild rationale (legacy-preserving)

- This run extends, not replaces, the original launcher.
- App metadata is derived from a generated manifest (`apps-manifest.json`) that is produced from
  `src/apps/registry.js` so route continuity is preserved.
- Rejected alternatives:
  - Full React rebuild in-place (higher regression risk for existing apps).
  - Directly importing the legacy registry into a new SPA bundle (extra build pipeline drift).

## Extensions added on this slice

- Manifest-backed discovery surface with deterministic filtering and persistence.
- Local UX improvements:
  - Save/unsave favorites.
  - Recently opened quick resume list.
  - Search with empty-state feedback.
  - Runtime evidence trace for easier future debugging.
- Keyboard and workflow upgrades:
  - Focus search with `/` shortcut.
  - Toggle favorites-only filtering with `F`.
  - Launch random app with `R`.
  - Clear all filters with `C`.
  - `Esc` blurs search quickly.
- Export/import workflow:
  - Export favorites as a deterministic JSON fixture.
  - Import favorites fixture from local JSON.
  - Clear favorites and recent-history actions.
- Data-logic refinements:
  - Persist favorites-only state in local storage.
  - Validate imported favorites against current catalog IDs.
  - Track import operation metadata in runtime evidence.

## Verification evidence

- Manifest extraction from `src/apps/registry.js` reports `apps_count=25`.
- Manual smoke check performed against `/modern/` route after local server start.

## Next logical improvements

- Add a small accessibility pass for keyboard focus order and visible shortcut callouts.
- Add optional favorites import error banners in the UI when imports fail.
- Optional Vercel deploy for `/modern/` for a quick public demo surface.
