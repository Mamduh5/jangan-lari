# Codex Agent Loop

Use this loop for future `.io` MVP implementation tasks in this repo.

## Default Loop

1. Inspect
   - Confirm branch and working tree status.
   - Read the files that own the requested behavior before editing.
   - Check nearby tests and existing helper APIs.

2. Plan
   - State the narrow behavior target.
   - Identify files likely to change.
   - Call out what is intentionally not changing.

3. Implement Small Change
   - Keep the change scoped to the sprint task.
   - Reuse current Phaser, scene, entity, data, save, debug, and test patterns.
   - Do not delete old systems unless the task explicitly asks for removal.
   - Do not introduce multiplayer, backend, or `newsystem` dependencies.

4. Test
   - Run the smallest meaningful test set first.
   - Prefer focused unit tests for pure logic.
   - Use focused Playwright specs for browser flow, restart, mobile layout, and regression behavior.
   - Run `npm run build` before closing implementation work when TypeScript or runtime code changed.

5. Summarize
   - List changed files.
   - Explain behavior changes, not just code edits.
   - Report exact commands run and whether they passed.
   - Separate verified behavior from anything not manually or browser-tested.

6. Stop
   - Do not continue into the next sprint without a new prompt.
   - Do not add polish, content, or architecture cleanup outside the requested slice.

## Acceptance Criteria Format

Each future task should include acceptance criteria in this shape:

- Behavior: what the player or system can now do.
- Scope: files or systems expected to change.
- Constraints: what must not change.
- Tests: exact unit, build, or Playwright checks expected.
- Verification notes: any manual mobile-browser checks required.

## Testing Expectations

- Documentation-only changes do not require unit or e2e tests unless the task asks for them.
- Pure data or math changes should have Vitest coverage.
- Phaser scene, input, HUD, restart, and mobile behavior should include Playwright coverage where practical.
- Performance-sensitive work should include a basic browser smoke check and a note about frame-rate or object-count risk.
- Existing tests should not be modified just to make a failing behavior pass unless the product contract truly changed.

## Testing Ladder

For a normal feature sprint, use this ladder:

1. `npm test`
2. `npm run build`
3. `git diff --check`
4. One focused e2e command for the feature under change, when browser coverage is needed.

Use the focused e2e scripts in `package.json` for normal sprint browser checks:

- `npm run test:e2e:menu`
- `npm run test:e2e:special`
- `npm run test:e2e:hud`
- `npm run test:e2e:neutral-shapes`
- `npm run test:e2e:stat-allocation`
- `npm run test:e2e:class-branching`
- `npm run test:e2e:leaderboard`
- `npm run test:e2e:smoke` for the bounded stable smoke set.

Do not run the full Playwright suite during normal feature work. `npm run test:e2e` is reserved for milestone validation, pre-merge validation, or explicit test-maintenance tasks. As of Sprint 6, `tests/e2e/gameplay-bot.spec.ts` is known long-running after the Sprint 2-4 progression changes and requires dedicated recalibration before it can serve as a routine full-suite gate.

Pure docs, type-contract, or mapper-only multiplayer-prep work should use unit tests, build, and `git diff --check`. Run browser smoke only when runtime behavior, package scripts, HUD/debug runtime surfaces, or scene wiring changed.

If a full e2e run is explicitly requested and fails, stop after the first failure. Report the failing spec, the likely product or test-maintenance root cause, and the smallest recommended follow-up. Do not loop on unrelated legacy specs, increase timeouts broadly, or rewrite deterministic loadout tests as part of a feature sprint.
