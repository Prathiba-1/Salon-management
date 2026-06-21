# Deploying to Netlify (+ moving from local Supabase to hosted)

Two separate moves bundled into one runbook, since Netlify can't reach your
laptop's local Supabase stack — your frontend needs a real `https://*.supabase.co`
URL before it can go live.

**Order matters:** do Part A completely first. Don't start Part B until your
hosted Supabase project is seeded and verified — deploying a frontend that
points at an empty/misconfigured backend just moves today's debugging onto a
public URL instead of localhost.

---

## Part A — Move Supabase from local to hosted

### A1. Link your project

```bash
cd supabase_m7
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is the subdomain in your Supabase dashboard URL
(`https://YOUR_REF.supabase.co`), or Project Settings → General → Reference ID.

### A2. Push every migration

```bash
supabase db push
```

This applies all 11 migrations (0001–0011) in order, in one shot, to the
hosted project. Watch the output closely:

- **If `0009` (pg_cron) errors:** unlikely — hosted Supabase DOES support
  pg_cron (unlike the local image), so this should actually succeed here. If
  it still fails, check Database → Extensions in the Supabase dashboard and
  enable `pg_cron` manually, then re-run `supabase db push`.
- **If `0010` (Realtime Authorization / `realtime.messages` policies)
  errors:** this was flagged as the lowest-confidence migration when built —
  if it fails, comment out just the two `create policy ... on
  realtime.messages` blocks at the bottom of that file (the `alter
  publication` lines above them are stable and should apply fine), push
  again, and revisit those two policies separately against Supabase's
  current Realtime Authorization docs.

### A3. Re-seed against hosted

```bash
export SUPABASE_URL=https://YOUR_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service_role key from Project Settings -> API>
npm run seed
npm run create-test-users
```

**Use real credentials going forward** — or better, create proper
owner/staff accounts now instead of relying on `owner@glowbright.test` /
`TestPass123!` once this is live on a public URL. At minimum, change those
passwords before anyone outside your team could guess the well-known test login.

### A4. Re-run the verification checklist

Don't skip this — hosted Supabase has already surprised us twice (pg_cron,
the auth.email config keys) versus local. Quickly re-confirm:

```bash
curl 'https://YOUR_REF.supabase.co/rest/v1/Invoice?select=*' \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer <staff access_token>"
# expect []

curl 'https://YOUR_REF.supabase.co/rest/v1/rpc/calendar_grid' \
  -X POST -H "apikey: <anon key>" -H "Authorization: Bearer <owner access_token>" \
  -H "Content-Type: application/json" -d '{"p_date": "2026-06-21"}'
# expect appointments with nested "customer" objects
```

### A5. Configure Auth redirect URLs for your future Netlify domain

In the Supabase dashboard: Authentication -> URL Configuration. You'll come
back to add your Netlify URL here once Part B gives you the actual
`*.netlify.app` address.

### A6. Turn email confirmations back on

Local dev had `enable_confirmations = false` for speed. For anything
real-world facing, check Authentication -> Providers -> Email in the hosted
dashboard and confirm confirmations are enabled, so a future real
signup/invite flow isn't wide open. Not urgent if you're only ever creating
accounts yourself via the admin script, but worth deciding deliberately.

---

## Part B — Deploy to Netlify

### B1. What's already prepared in this codebase

- `netlify.toml` — build command (`npm run build`), publish dir (`dist`),
  SPA redirect (so `/calendar`, `/login` etc. don't 404 on refresh), Node
  version pinned to 20, basic security headers, cache rules
- `public/_redirects` — same SPA fallback, belt-and-suspenders
- All frontend code already branches on `VITE_USE_MOCKS` / `VITE_SUPABASE_*`
  env vars — nothing else to change in code, only environment configuration

### B2. Push your code to a Git repo

Netlify deploys from Git (GitHub/GitLab/Bitbucket), not a local folder
upload, if you want continuous deploys on every push.

```bash
cd /path/to/your/salon-app
git init
git add .
git commit -m "Ready for Netlify deploy"
git remote add origin <your-repo-url>
git push -u origin main
```

**Before committing, confirm `.env` is gitignored:**
```bash
cat .gitignore | grep -i env
```
If `.env` isn't listed, add it now, before the commit above.

### B3. Create the Netlify site

1. app.netlify.com -> Add new site -> Import an existing project
2. Connect your Git provider, select the repo
3. Confirm the build command/publish dir show `npm run build` / `dist`
   (should auto-detect from `netlify.toml`)
4. Don't click Deploy yet — add environment variables first

### B4. Set environment variables

In the Netlify site's Site configuration -> Environment variables, add:

```
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=<your hosted anon key>
```

**Never put the service_role key here** — only the anon key belongs in a
frontend build.

### B5. Deploy

Click Deploy site. Watch the build log:

- **If `tsc` fails:** this is the single most likely failure point —
  `tsc && vite build` means any TypeScript error blocks the whole deploy,
  and a full `tsc` build has not been run against this codebase at any point
  in this conversation (no Node/npm available in the environment this was
  built in). Read the exact error from Netlify's build log and treat it as a
  real type error to fix, not an environment quirk.
- **If the build succeeds but the deployed site shows a blank page:** open
  the browser console on the live URL — almost always a missing/wrong env
  var (re-check B4) or a routing issue (re-check `netlify.toml` deployed
  correctly via the deploy's "Source" tab).

### B6. Update Supabase redirect URLs

Once deployed, copy your live URL and add it to Supabase Authentication ->
URL Configuration -> Redirect URLs and Site URL. Without this, login may
work but redirect incorrectly, or get rejected outright.

### B7. Smoke test the live site

Walk the same checklist as RUNBOOK_M10.md's definition-of-done section,
against the live Netlify URL instead of localhost: login for all 3 roles,
Daily Pulse customer names, Calendar drag-and-drop + Mark Complete colour,
Customers/Invoices/Staff details/Inventory all loading, a second tab
reflecting a live change via Realtime.

---

## Ongoing: every future code change

```bash
git add .
git commit -m "..."
git push
```

Netlify auto-deploys on every push to your connected branch by default.

---

## Known risks specific to this jump

| Risk | Why | What to do |
|---|---|---|
| `tsc` has never been run | This entire M10 build + bug-fix pass happened without Node/npm available to verify | Run `npm run build` locally first, before pushing, so you debug with full context rather than in a CI log |
| CORS on hosted Supabase | Hosted Supabase restricts origins differently than local | If API calls fail only on the deployed site, check Supabase URL Configuration includes your Netlify domain |
| `pg_cron` / `realtime.messages` migrations | Flagged as lower-confidence when built; local couldn't fully verify either | Re-test inventory alerts (M9.4) and Realtime (M9.1) specifically against hosted — don't assume local "passing" means hosted behaves identically |
| Well-known test credentials | `owner@glowbright.test` / `TestPass123!` is documented in multiple runbooks | Rotate these or create real accounts before treating this as more than a demo URL |
