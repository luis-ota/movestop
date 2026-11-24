# Contributing to MOVESTOP

Thanks for helping build MOVESTOP. The project is currently maintained by [@luis-ota](https://github.com/luis-ota); a friend may join later. Everyone is welcome to open issues and pull requests.

## Before you start

- Read [`README.md`](README.md), [`docs/ONLINE.md`](docs/ONLINE.md) and [`ROADMAP.md`](ROADMAP.md).
- For a large feature or gameplay change, open an issue first so we can agree on scope.
- Never commit secrets, real personal data, customer data or private infrastructure credentials.
- Keep the single-player campaign static-deployable. The online duel is the only part that needs the Bun server.

## Local setup

Use Bun; do not use npm, pnpm or yarn.

```bash
bun install --frozen-lockfile
bun run dev
bun run server
```

The Vite dev server runs on `http://localhost:5173`; the duel server runs on `http://localhost:8788` and Vite proxies `/ws` to it.

## Checks

Before opening a pull request, run:

```bash
bun test
bun run build
bun run typecheck:server
```

CI runs on `instabox-medium`, not GitHub-hosted Ubuntu runners. Jobs queue when the shared instabox slot is busy.

## Project rules

- Critical online state stays server-authoritative: position, HP, ammo, damage, cooldowns, focus, rounds and winner.
- The browser sends intents only. Client prediction and interpolation are presentation.
- Keep gameplay data synthetic. No real user data belongs in fixtures or screenshots.
- Preserve the existing editorial Japanese/voxel art direction and mobile-safe corner controls.
- Add or update tests for server, protocol or rules changes.
- Keep commits focused and explain gameplay/security decisions in the pull request.

## Pull requests

Use the pull request template, link the issue it solves, describe the player-visible change and list the checks you ran. Screenshots or a short recording help for UI changes.
