# Saloniq — M1 Setup

## First-time setup

```bash
npm install
npx msw init public/ --save
npm run dev
```

That's it. The app runs on http://localhost:5173

## Project structure

```
src/
├── components/ui/     # All UI primitives (Button, Badge, Card, etc.)
├── hooks/             # useAuth
├── layouts/           # AppShell, AuthContext, ProtectedRoute
├── mocks/             # MSW handlers + in-memory seed DB
└── main.tsx           # Entry point
```

## Switching roles (dev only)

In `AuthContext.tsx`, change the default role on line:
```ts
const [role, setRole] = useState<UserRole>('OWNER')
// change to 'STAFF' or 'ADMIN' to test ProtectedRoute
```
