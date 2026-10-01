# lmwn-openrouter-quota

Read-only dashboard for one OpenRouter key (`GET /api/v1/key`): limit, remaining,
daily/weekly/monthly usage.

## Security model
- The key lives only in the server environment (`OPENROUTER_API_KEY`, never `NEXT_PUBLIC_*`).
- The only outbound call is a fixed `GET https://openrouter.ai/api/v1/key` in `src/lib/openrouter.ts`
  (`server-only`, so importing it from client code fails the build). No path/host comes from a request.
- There are no API routes, so the app cannot be used to reach any other OpenRouter endpoint.
- Only a whitelist of fields reaches the page. `label` (masked key), user/org/workspace ids are dropped.
- CSP `connect-src 'self'`, `no-store`, `noindex`, and the server binds to `127.0.0.1`.
- `npm run check:secret` fails if the key shows up in `.next`, if an API route exists, or if the
  OpenRouter URL is referenced outside the server module.

## Run
```bash
npm install
cp .env.example .env.local   # then fill OPENROUTER_API_KEY
npm run dev                  # http://127.0.0.1:3000
```
Or reuse the key from the JERA app without copying it: `npm run dev:jera`.

Production check: `npm run build && OPENROUTER_API_KEY=... npm run check:secret`.
