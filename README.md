# Quizora

Master any subject. Track your progress.

A React + Vite quiz application with Firebase authentication and Firestore for storing quiz banks, user profiles, and results.

## Features

- **Full Quizzes** — Complete all questions from any quiz bank
- **Rapid Mode** — 20 random questions for a quick session.
- **Instant Feedback** — See correct/incorrect answers immediately after selecting.
- **Multi-Select** — Questions needing multiple answers include a "None of the above" option.
- **Timer** — Automatically calculated (~73s per question, based on 80 min for 65 questions).
- **Flagging** — Mark questions to review later.
- **4 Themes** — Midnight, Dawn, Forest, Ember. Switchable in Profile, persisted to your account.
- **Stats & History** — Track quizzes taken, accuracy, and correct answers over time.
- **Answer Review** — After each quiz, review every question with your answers vs. the correct ones.

## Tech Stack

- **Frontend**: React 19, Vite 8, React Router v7
- **Backend**: Firebase Auth + Firestore
- **Icons**: lucide-react
- **Notifications**: react-hot-toast
- **Testing**: Playwright (E2E)

## Project Structure

```
src/
├── main.jsx              — Entry point
├── index.css             — Global styles + design tokens (CSS custom properties + light/dark theme)
├── App.jsx               — Router, auth provider, toaster setup
├── context/
│   └── AuthContext.jsx   — Auth state + theme management
├── firebase/
│   ├── config.js          — Firebase initialization
│   ├── auth.js            — Auth functions (login, register, Google, logout, theme)
│   └── firestore.js       — DB functions (quiz banks, results)
└── pages/
    ├── Auth/             — Sign in / Sign up
    ├── Home/             — Dashboard with quiz listing + Rapid toggle per bank
    ├── Quiz/             — Quiz-taking interface (instant feedback, timer, flagging)
    ├── Results/          — Score ring + answer review
    └── Profile/          — User stats, history, theme toggle
tests/                    — Playwright E2E tests
scripts/                  — Seed scripts for loading quiz banks into Firestore
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |
| `npm run seed` | Seed quiz banks to Firestore |
| `npm run test:e2e` | Run Playwright E2E tests |

## Design System

The app uses CSS custom properties with 4 themes: Midnight (dark), Dawn (light), Forest (green dark), and Ember (warm dark). All color tokens are defined in `src/index.css` under `[data-theme="..."]` blocks. Theme is persisted per-user in Firestore and switchable from the Profile page.

See [CLAUDE.md](CLAUDE.md) and [PLANNING.md](PLANNING.md) for architecture and style guidelines.

## Environment

Firebase config is embedded in `src/firebase/config.js`. Security is enforced through Firestore security rules (no server-side auth required for this app model).
