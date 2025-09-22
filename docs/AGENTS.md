# g1 Agent Handbook

Welcome! This guide captures expectations for future coding agents collaborating on the g1 React micro app collection. The rules in this file apply to the entire repository.

## Quick start
- Use Node.js 18 or 20 when possible. Install dependencies with `npm install` before running any scripts.
- Local development happens through `npm start`, which runs webpack-dev-server on port 3000.
- The production bundle is created with `npm run build`; assets are emitted to `dist/`.

## Required checks
- When you change any JavaScript, JSX, or CSS that impacts runtime behaviour or visuals, run `npm test`. The suite is powered by Jest and `@testing-library`.
- If you touch build tooling (webpack, Babel config, deployment setup) also run `npm run build` to ensure the bundle still compiles.
- Documentation-only updates (Markdown, plain text) do not require automated checks, but state this explicitly in your summary.

## Code conventions
- Components live in `src/components/` and in `src/apps/<AppName>/`. Prefer functional React components with hooks.
- Keep presentation and logic separated: shared layout bits belong in `src/components/`, app-specific state lives under each `src/apps/` folder.
- Styling is managed with plain CSS files colocated with their components. Reuse existing class names when extending styles and favour flexbox utilities already present in the project.
- Tests sit next to the code they cover, using Jest + Testing Library. Use `renderWithProviders` from `src/testUtils` when global wrappers are needed.

## When adding or changing apps
- Register the app in `src/apps/registry.js` and verify the launcher entry in `src/components/AppLauncher` renders correctly.
- Update `APPS.md` with a short blurb and usage tips for the new experience.
- If chess-related features change, also revise `CHESS.md` accordingly.

## Documentation expectations
- Keep this `AGENTS.md` file updated when conventions evolve.
- Maintain a running log of merges and significant decisions in `GITSTORY.md` (one line per event).
- Reflect user-facing updates in `README.md` so the GitHub page stays accurate.

Happy hacking!
