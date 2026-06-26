# JobPilot Authentication

Technical reference for the auth feature module. Updated per implementation module.

**Architecture:** modular monolith — one NestJS process, feature code under `src/modules/auth/`.

---

## Module 0 — Foundation (complete)

### Folder structure

```text
src/modules/auth/
├── auth.module.ts
├── schemas/          # user, subscription
├── services/         # password
├── enums/, interfaces/, constants/
```

---

## Module 1 — Core JWT Session (complete)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Create account |
| `POST` | `/api/v1/auth/login` | Public | Login → accessToken + refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Rotate refresh token |
| `POST` | `/api/v1/auth/logout` | Cookie | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | Bearer | Current user profile |

---

## Module 2 — Email Verification (complete)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/verify-email` | Public | `{ token }` → mark email verified |
| `POST` | `/api/v1/auth/resend-verification` | Public | Resend link (3/hour per IP) |

### Behaviour changes

- **Register** — sends verification email; no tokens returned
- **Login** — returns `403` if `emailVerified === false`
- **Dev** — verification link logged to console; Resend skipped if `RESEND_API_KEY=re_change_me`

### New files

```text
schemas/auth-token.schema.ts
services/email.service.ts
services/verification.service.ts
helpers/token.helper.ts
dto/verify-email.dto.ts
dto/resend-verification.dto.ts
```

### Frontend (jobpilot-ai)

- `src/api/client.ts`, `src/api/auth.api.ts`
- `VerifyEmail.tsx`, `CheckEmail.tsx`
- Register → check email screen; Login → resend on 403
- `.env`: `VITE_API_URL=http://localhost:3000`

### Local test flow

Requires Redis: `docker compose up -d`

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","password":"secret123"}'

# 2. Copy verification link from server log (development)

# 3. Verify
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"token":"RAW_TOKEN_FROM_LOG"}'

# 4. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' -c cookies.txt \
  -d '{"email":"test@example.com","password":"secret123"}'

# 5. Me
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Module 3 — Password Reset (complete)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/forgot-password` | Always 200 — sends reset email if local account exists |
| `POST` | `/api/v1/auth/reset-password` | `{ token, password }` — updates hash, revokes all refresh sessions |

### Behaviour

- Reset link expires in **1 hour**
- All Redis refresh sessions revoked after password reset
- Google-only accounts (no `passwordHash`) are ignored silently on forgot-password
- Dev: reset link logged to console (same as verification)

### Local test

```bash
# Request reset (check server log for link in dev)
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com"}'

# Reset password
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"RAW_TOKEN_FROM_LOG","password":"newsecret123"}'
```

### Frontend routes

- `/forgot-password` — request reset email
- `/reset-password?token=...` — set new password

---

## Module 4 — Google OAuth (complete)

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/auth/google` | Redirect to Google consent |
| `GET` | `/api/v1/auth/google/callback` | OAuth callback → refresh cookie + redirect frontend |

### Account linking

| Case | Action |
|------|--------|
| `googleId` exists | Sign in |
| Email exists (local) | Link `googleId`, add `google` to `authProviders`, mark verified |
| New user | Create account with `emailVerified: true` |

### Callback redirect

`{FRONTEND_URL}/auth/callback#accessToken=...` + `refreshToken` httpOnly cookie

### Google Cloud Console

**Authorized redirect URIs:**
- `http://localhost:3000/api/v1/auth/google/callback` (local)
- `https://jobpilot-api.duckdns.org/api/v1/auth/google/callback` (prod)

**Authorized JavaScript origins:**
- `http://localhost:5173`
- Your Cloudflare Pages URL

### Env vars

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

If Google env vars are missing, `/auth/google` returns `503`.

### Frontend

- `GoogleSignInButton` on Login + Register
- `/auth/callback` — reads hash, calls `/me`, redirects to dashboard

---

## Module 5 — Frontend Session Bootstrap (complete)

### Behaviour

- `accessToken` kept in memory only (`session-token.ts`); user/subscription persisted in `localStorage`
- On app load, `AuthBootstrap` waits for Zustand rehydration, then:
  1. If in-memory token exists → `GET /me`
  2. Else if persisted user or refresh cookie → `POST /refresh` then `GET /me`
  3. On failure → clear local session
- `apiFetch` attaches Bearer token automatically; on `401` retries once via `POST /refresh` (deduped)
- Protected routes wait for `authReady` before redirecting

### Frontend files

- `src/lib/session-token.ts` — in-memory access token + session event hooks
- `src/api/client.ts` — `apiFetch` with 401 refresh retry
- `src/components/auth/AuthBootstrap.tsx` — app-load session restore
- `src/store/authStore.ts` — `bootstrap()`, `authReady`

---

## Upcoming modules

| Module | Adds |
|--------|------|
| — | Auth complete for v1 |
