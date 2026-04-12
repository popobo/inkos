# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InkOS is an autonomous AI novel writing system built as a monorepo with pnpm workspaces. It orchestrates a 10-agent pipeline (Radar → Planner → Composer → Architect → Writer → Observer → Reflector → Normalizer → Auditor → Reviser) to generate, audit, and revise novel content with continuity tracking.

**Monorepo Structure:**
- `packages/core/` - Core engine: multi-agent pipeline, state management, LLM providers, models, and utilities
- `packages/cli/` - Commander.js CLI interface with 22 commands for book management, writing, and analytics
- `packages/studio/` - Web workbench (Vite + React + Hono) for visual book management and chapter review

## Common Commands

### Development
```bash
# Install dependencies (pnpm >= 9.0, Node >= 20)
pnpm install

# Watch mode (all packages)
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint
```

### Package-Specific Commands
```bash
# Core package only
pnpm --filter @actalk/inkos-core test
pnpm --filter @actalk/inkos-core build
pnpm --filter @actalk/inkos-core dev

# CLI package only
pnpm --filter @actalk/inkos test
pnpm --filter @actalk/inkos build
pnpm --filter @actalk/inkos dev

# Studio package only
pnpm --filter @actalk/inkos-studio test
pnpm --filter @actalk/inkos-studio build
pnpm --filter @actalk/inkos-studio dev
```

### Running Single Tests
```bash
# Vitest runs tests in src/__tests__/ directories
pnpm --filter @actalk/inkos-core test -- architect.test.ts
pnpm --filter @actalk/inkos test -- analytics.test.ts
```

### Release Verification
```bash
# Verify no workspace: protocols in publish manifests
pnpm verify:publish-manifests

# Full release check
pnpm release
```

## Architecture Overview

### Multi-Agent Pipeline
The writing pipeline is orchestrated by `PipelineRunner` ([`packages/core/src/pipeline/runner.ts`](packages/core/src/pipeline/runner.ts)) and consists of these phases:

**Phase 1 - Input Governance:**
1. **Planner** ([`packages/core/src/agents/planner.ts`](packages/core/src/agents/planner.ts)) - Generates chapter intent with hook agenda
2. **Composer** ([`packages/core/src/agents/composer.ts`](packages/core/src/agents/composer.ts)) - Selects relevant context and compiles rule stack

**Phase 2 - Creative Writing (temp 0.7):**
3. **Architect** ([`packages/core/src/agents/architect.ts`](packages/core/src/agents/architect.ts)) - Plans chapter structure and scene beats
4. **Writer** ([`packages/core/src/agents/writer.ts`](packages/core/src/agents/writer.ts)) - Generates prose with length governance and dialogue guidance

**Phase 3 - State Settlement (temp 0.3):**
5. **Observer** (via Writer) - Over-extracts 9 categories of facts from text
6. **Reflector** (via Writer) - Outputs JSON delta for immutable state update

**Phase 4 - Quality Loop:**
7. **Normalizer** ([`packages/core/src/agents/length-normalizer.ts`](packages/core/src/agents/length-normalizer.ts)) - Adjusts chapter length to target band
8. **Auditor** ([`packages/core/src/agents/continuity.ts`](packages/core/src/agents/continuity.ts)) - 33-dimension continuity check
9. **Reviser** ([`packages/core/src/agents/reviser.ts`](packages/core/src/agents/reviser.ts)) - Auto-fixes critical issues in self-correction loop

### State Management System
The system maintains 7 "truth files" as the single source of truth for narrative continuity:

- **World State** ([`current_state.md`](packages/core/src/models/state.ts)) - Character locations, relationships, known information
- **Resource Ledger** ([`particle_ledger.md`](packages/core/src/models/state.ts)) - Items, money, power levels with decay tracking
- **Pending Hooks** ([`pending_hooks.md`](packages/core/src/models/state.ts)) - Unresolved plot threads with structured operations
- **Chapter Summaries** ([`chapter_summaries.md`](packages/core/src/models/state.ts)) - Per-chapter event summaries
- **Subplot Board** ([`subplot_board.md`](packages/core/src/models/state.ts)) - A/B/C plot line tracking
- **Emotional Arcs** ([`emotional_arcs.md`](packages/core/src/models/state.ts)) - Character emotional progression
- **Character Matrix** ([`character_matrix.md`](packages/core/src/models/state.ts)) - Character interaction records

**Critical Implementation Detail:** Since v0.6.0, the authoritative source is schema-validated JSON in `story/state/*.json` (Zod schemas). The markdown files in `story/` are human-readable projections. State updates use immutable deltas via `applyRuntimeStateDelta()` ([`packages/core/src/state/state-reducer.ts`](packages/core/src/state/state-reducer.ts)) with `validateRuntimeState()` ([`packages/core/src/state/state-validator.ts`](packages/core/src/state/state-validator.ts)).

### Memory & Context System
- **SQLite Temporal Memory** ([`packages/core/src/state/memory-db.ts`](packages/core/src/state/memory-db.ts)) - Node 22+ automatic DB for relevance-based fact retrieval
- **Context Filtering** ([`packages/core/src/utils/context-filter.ts`](packages/core/src/utils/context-filter.ts)) - Selects relevant truth file content by chapter
- **Runtime Artifacts** - `story/runtime/chapter-XXX.*` files (intent.md, context.json, rule-stack.yaml, trace.json)

### LLM Abstraction
- **Provider Layer** ([`packages/core/src/llm/provider.ts`](packages/core/src/llm/provider.ts)) - Unified interface for OpenAI/Anthropic/custom APIs
- **Multi-Model Routing** - Different agents can use different models/providers (configure via `inkos config set-model`)
- **Stream Monitoring** - Real-time progress tracking with `createStreamMonitor()`

### Models & Validation
All data structures are defined in [`packages/core/src/models/`](packages/core/src/models/) with Zod schemas:
- [`book.ts`](packages/core/src/models/book.ts) - Book configuration, status, genres
- [`chapter.ts`](packages/core/src/models/chapter.ts) - Chapter metadata and status
- [`project.ts`](packages/core/src/models/project.ts) - Project-level configuration
- [`runtime-state.ts`](packages/core/src/models/runtime-state.ts) - Structured state with hook operations
- [`input-governance.ts`](packages/core/src/models/input-governance.ts) - Intent, context, rule stack models

### CLI Commands
CLI commands are in [`packages/cli/src/commands/`](packages/cli/src/commands/) as separate modules, registered in [`packages/cli/src/index.ts`](packages/cli/src/index.ts). All content-generating commands support `--json` output for structured data.

### Key File Patterns
- Tests: `src/__tests__/*.test.ts` (Vitest)
- Source: `src/<module>/<name>.ts`
- Models: `src/models/<name>.ts` (with Zod schemas)
- Agents: `src/agents/<name>.ts`
- Pipeline: `src/pipeline/<name>.ts`
- Utils: `src/utils/<name>.ts`

## Code Conventions

- **TypeScript strict mode** - All files must pass `pnpm typecheck`
- **Immutable patterns** - Use `{ ...obj, key: value }` over mutation
- **Function length** - Keep functions under 50 lines when possible
- **File length** - Keep files under 800 lines; split if needed
- **Error handling** - Errors must surface; swallowing errors requires explanatory comment
- **Workspace protocol** - Use `workspace:*` in source `package.json` (CI handles version replacement)

## Testing Strategy

- **Unit tests** - Test individual agents, utilities, models in isolation
- **Integration tests** - Test pipeline stages and command workflows
- **Mock LLM calls** - Don't make real API requests in tests; use fixtures
- **Test location** - Place tests in `src/__tests__/` next to source code

## Adding Features

### New CLI Command
1. Create command file in [`packages/cli/src/commands/<name>.ts`](packages/cli/src/commands/)
2. Export a `Command` instance using Commander.js
3. Register in [`packages/cli/src/index.ts`](packages/cli/src/index.ts)
4. Add `--json` output support
5. Support book-id auto-detection when only one book exists

### New Agent
1. Create agent class in [`packages/core/src/agents/<name>.ts`](packages/core/src/agents/)
2. Extend [`BaseAgent`](packages/core/src/agents/base.ts) if needed
3. Define input/output types as Zod schemas
4. Add tests in `src/__tests__/`
5. Export from [`packages/core/src/index.ts`](packages/core/src/index.ts)

### New Genre Profile
1. Create [`packages/core/genres/<id>.md`](packages/core/genres/) with YAML frontmatter
2. Define: `chapterTypes`, `fatigueWords`, `numericalSystem`, `powerScaling`, `pacingRule`, `satisfactionTypes`, `auditDimensions`, `language`
3. Add body content with prohibitions, language rules, narrative guidance

## Important Constraints

- **Node >= 20.0.0** - Required for SQLite memory database and ES2022 features
- **pnpm >= 9.0.0** - Required for workspace protocol handling
- **TypeScript 5.x** - Using latest TypeScript features
- **ESM only** - No CommonJS; use `.js` extensions in imports
- **License** - AGPL-3.0-only for all packages

## Common Issues & Solutions

- **Build fails with "Cannot find module"** - Run `pnpm build` from root to build dependencies first
- **Tests fail with "workspace:* not resolved"** - This is expected in source; CI handles version replacement
- **Type errors after schema changes** - Regenerate types if using code generation; check Zod schema exports
- **Import errors** - Ensure imports use `.js` extensions (TypeScript ESM mode)
