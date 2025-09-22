# Testing Guide

Cache Learning Lab ships three layers of automated tests.

## Unit tests (Vitest)

```bash
pnpm --filter cache-lab test --run
```

Covers:
- `address_breakdown.spec.ts` and `mapping.spec.ts` – bit math and golden trace behaviour.
- `policies_lru_fifo_random.spec.ts` – policy divergence and deterministic Random.
- `classifier_three_run.spec.ts` – compulsory/conflict/capacity classification.
- `hierarchy_amat.spec.ts` – AMAT sanity checks.
- `pipeline_cpi.spec.ts` – CPI formula invariants.
- `parser_csv.spec.ts` – CSV ingestion.

## Property-based tests (fast-check via Vitest)

```bash
pnpm --filter cache-lab test --run --grep "invariants"
```

- `trace_invariants.fc.spec.ts` ensures deterministic metrics when replaying the same trace.
- `policy_invariants.fc.spec.ts` compares LRU/FIFO on working-set patterns and sequential vs random locality.

## Coverage

```bash
pnpm --filter cache-lab test --coverage
```

c8 thresholds (90% lines/branches) are enforced via `vite.config.ts`. Reports appear in `coverage/`.

## End-to-end tests (Playwright)

```bash
pnpm --filter cache-lab exec playwright test
```

The Playwright config spins up `pnpm --filter cache-lab preview` and walks the main flows:
1. Mapping Explorer input and grid highlight.
2. Replacement Simulator table rendering.
3. Parameter Playground chart and CSV button.
4. Miss Classifier table.
5. Hierarchy Explorer + Pipeline Impact updates.
6. Trace Loader sample import.
7. Dashboard navigation.

Ensure `pnpm install` has been executed at the repo root before running the suite.

## Adding new golden traces

1. Place CSV files in `apps/cache-lab/public/samples/`.
2. Reference them from the Trace Loader module (buttons) or load them manually via the UI.
3. For deterministic tests, prefer storing small traces and verifying simulation metrics via unit or property-based tests.
