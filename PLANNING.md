# Quizora — Planning & Architecture

## Tech Stack
- **Frontend**: React 19, Vite 8, React Router v7
- **Auth**: Firebase Auth (email/password + Google)
- **Database**: Firestore (quiz banks, user profiles, results)
- **Styling**: Plain CSS with CSS custom properties (design tokens)
- **Icons**: lucide-react
- **Notifications**: react-hot-toast

## Project Structure
```
src/
├── main.jsx              — Entry point
├── index.css             — Global styles + design tokens
├── App.jsx               — Root: router, auth provider, toaster
├── context/
│   └── AuthContext.jsx    — Auth state + user profile context
├── firebase/
│   ├── config.js          — Firebase init (app, auth, db, provider)
│   ├── auth.js            — Auth functions (register, login, google, logout, stats)
│   └── firestore.js       — DB functions (quiz banks, results, seed)
└── pages/
    ├── Auth/              — Login / Register page
    ├── Home/              — Dashboard with quiz bank listing + stats
    ├── Quiz/              — Quiz-taking (questions, timer, flagging)
    ├── Results/           — Score display + answer review
    └── Profile/           — User stats + quiz history
```

## Routing
| Path | Component | Access |
|------|-----------|--------|
| `/auth` | Auth | Public |
| `/` | Home | Protected |
| `/quiz/:id` | Quiz | Protected |
| `/results` | Results | Protected |
| `/profile` | Profile | Protected |

Protected routes use `<Protected>` wrapper that redirects to `/auth` if unauthenticated.

## Data Flow
1. **Auth**: `onAuthStateChanged` listener in AuthContext → sets user + profile
2. **Quiz Banks**: Firestore collection `quizBanks` → fetched once on Home mount
3. **Results**: On quiz submit → `saveResult` to Firestore + `updateUserStats`
4. **History**: `getUserResults` query filtered by `uid`, ordered by `completedAt`

## Firestore Collections
- `users/{uid}` — displayName, email, totalQuizzes, totalCorrect, streak, lastActive
- `quizBanks/{id}` — title, category, difficulty, timeLimit, questions[], questionCount
- `results/{id}` — uid, bankId, score, total, percentage, answers[], completedAt

## Design Tokens (CSS Custom Properties)
Defined in `src/index.css`:
- `--accent`, `--accent2` — primary gradient colors
- `--bg`, `--surface`, `--border` — surface hierarchy
- `--text`, `--text-muted` — typography
- `.glass` — backdrop blur card container
- Always use these tokens; never hardcode HSL values in page CSS.

## Key Patterns
- Components are **page-level**: one directory per route with `Component.jsx` + `Component.css`
- **Auth state**: via `useAuth()` hook from AuthContext
- **Navigation**: `useNavigate()` from react-router-dom
- **Error display**: `toast.error()` from react-hot-toast
- **Icons**: lucide-react components, size prop for scaling
- Firebase config is client-side; security relies on Firestore rules
