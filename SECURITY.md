# Security policy

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** button on the repository's Security tab. Do not open a public issue for an exploitable vulnerability, and do not include live credentials or personal data in the report.

Include, when possible:

- a short description and affected component;
- steps to reproduce;
- expected versus actual behavior;
- the impact you believe it has;
- whether the issue affects the static campaign, the authoritative duel server, or both.

This is a small prototype maintained by one person. Response times are best-effort, but reports are taken seriously.

## Scope

The highest-value areas are:

- WebSocket validation, Origin/IP policy and rate limits in `server/`;
- authoritative movement, combat, rounds and room lifecycle in `server/duel-room.ts`;
- static file serving, CSP and security headers;
- any path that could expose secrets, personal data or private infrastructure.

Known limitations are documented in [`docs/ONLINE.md`](docs/ONLINE.md): wallhack/aimbot are not fully preventable, rooms are in memory, and real-money purchases are not server-verified.
