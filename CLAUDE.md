# Quizora — CLAUDE.md

## Project Overview
React + Vite quiz application with Firebase Auth and Firestore. Users take quizzes from curated banks, track stats, and review results.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run seed` — Seed quiz banks to Firestore
- `npm run test:e2e` — Run Playwright E2E tests

## Code Style & Structure
- **React 19** with functional components and hooks
- **No TypeScript** — plain JSX throughout
- **CSS** per-page files in page directories, global tokens in `src/index.css`
- **Firebase** config in `src/firebase/`, context in `src/context/`
- **Routing** via react-router-dom v7 with `Protected` wrapper component
- **Imports**: absolute within project (e.g., `./firebase/auth` not relative paths into deeply nested)

## Design Tokens (CSS Custom Properties)
Used in `src/index.css` — always reference these instead of hardcoding HSL values:
- `--accent` `--accent2` — primary gradient colors
- `--bg` `--surface` `--border` — surface hierarchy
- `--text` `--text-muted` — typography colors
- `.glass` — backdrop blur card style

## Behavioral Guidelines

### 1. Think Before Coding
- State assumptions explicitly before implementing.
- If a requirement is unclear, ask for clarification.
- Suggest simpler approaches — push back on over-engineering.

### 2. Simplicity First
- Write the minimum code required. No speculative abstractions.
- Do not abstract code used only once.
- Realistic error handling only — handle plausible scenarios.

### 3. Surgical Changes
- Only touch code directly related to the request.
- Do not "improve" adjacent formatting or comments.
- Match existing code style exactly.
- Remove imports/variables *your* changes made unused.

### 4. File Size Limits
- No file longer than 500 lines. Split into modules if approaching.

### 5. Testing
- Create Playwright E2E tests for new features.
- Tests live in `tests/` directory mirroring app structure.
- Include: expected use, edge case, failure case.

### 6. Documentation
- Update README.md when features, dependencies, or setup steps change.
- Comment non-obvious code — explain *why*, not *what*.

### 7. AI Behavior Rules
- Never assume missing context. Ask questions if uncertain.
- Never hallucinate libraries or functions.
- Confirm file paths and module names exist before referencing them.
- Never delete or overwrite existing code unless explicitly instructed.
