# g1 Agent Handbook

Welcome! This guide captures expectations for future coding agents collaborating on the g1 React micro app collection. The rules in this file apply to the entire repository.

## Quick start
- Use Node.js 18 or 20 when possible. Install dependencies with `npm install` before running any scripts.
- Install `pnpm` globally (`npm install -g pnpm`) so you can use the workspace-aware scripts.
- Local development happens through `npm start`, which runs webpack-dev-server on port 3000. If you are iterating on the cache lab workspace run `npm run dev` to launch both webpack and the pnpm workspace watcher together.
- The production bundle is created with `npm run build`; assets are emitted to `dist/`.

## Required checks
- When you change any JavaScript, JSX, or CSS that impacts runtime behaviour or visuals, run `npm test`. The suite is powered by Jest and `@testing-library`.
- Run `npm run lint` after touching JavaScript or JSX to catch issues before CI.
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

### Workspace-specific workflows
- **cache lab** (`src/apps/cache-lab`): use the pnpm scripts exposed through the root package. `npm run dev` launches the workspace `dev` task alongside the main webpack server, while `npm run test:cache-lab` and `npm run e2e:cache-lab` proxy the respective pnpm commands.
- **etymosphere** (`apps/etymosphere`): use the npm prefix helpers like `npm run etymosphere:dev` for local work and `npm run etymosphere:test` before submitting changes.

## Documentation expectations
- Keep this `AGENTS.md` file updated when conventions evolve.
- Maintain a running log of merges and significant decisions in `GITSTORY.md` (one line per event).
- Reflect user-facing updates in `README.md` so the GitHub page stays accurate.
- When touching gist-enabled experiences, update [`GIST_SETTINGS.md`](GIST_SETTINGS.md) so contributors know how the shared settings flow behaves.

Happy hacking!
