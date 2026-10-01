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

## Docker
The key is passed at run time only; it is never baked into the image (`.env*` is in `.dockerignore`).

```bash
docker build -t lmwn-openrouter-quota .
# publish on loopback only, so the dashboard is not reachable from the network
docker run --rm -p 127.0.0.1:3000:3000 -e OPENROUTER_API_KEY lmwn-openrouter-quota
```
`-e OPENROUTER_API_KEY` (without a value) forwards the variable from your shell, so the key does not
appear in the command line or shell history. Inside the container the server listens on 0.0.0.0,
which is why the port must be published to 127.0.0.1 as above.

### Docker Compose
```bash
set -a; . ../../LMP/genie-jeracloud/pos-mcp/apps/jera/.env; set +a   # or export OPENROUTER_API_KEY yourself
docker compose up -d --build        # http://127.0.0.1:3000
docker compose logs -f quota
docker compose down
```
Compose refuses to start if `OPENROUTER_API_KEY` is empty. A key exported in your shell takes
precedence over `./.env`, so make sure `./.env` does not hold an old key. The container runs as a
non-root user with a read-only filesystem, no Linux capabilities and the port published on
127.0.0.1 only. Set `PORT=3939` to change the host port.
