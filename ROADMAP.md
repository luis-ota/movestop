# Roadmap

This is a living plan, not a promise of dates. The project is currently maintained by one person; a friend may help later. Issues and pull requests are welcome.

## Online duel

- [ ] Graceful deploys: drain active rooms before a restart and queue new connections during the swap.
- [ ] Reconnect/resume with a short-lived, server-issued room token.
- [ ] Optional accounts and persistent profiles without making critical gameplay state client-authoritative.
- [ ] Server-verified cosmetic entitlements; keep paid items out of competitive stats.
- [ ] More arenas and symmetric cover presets.
- [ ] Match history and shareable result cards.
- [ ] Behavioral anti-cheat signals and better observability, without claiming wallhack prevention.
- [ ] Load testing for concurrent rooms, WebSocket reconnects and Cloudflare/Traefik timeouts.

## Campaign and game feel

- [ ] Additional acts, encounters and a second boss with new mechanics.
- [ ] Controller support for desktop and mobile keyboards.
- [ ] Accessibility pass: remappable keys, colorblind-safe cues, reduced motion and readable HUD scaling.
- [ ] Localization infrastructure and a first complete translation.
- [ ] Performance budgets for low-end mobile devices and automatic quality tiers.
- [ ] More combo, parry and Iai animations with consistent hit feedback.

## Platform and community

- [ ] Release process with tagged builds, changelog and downloadable web builds.
- [ ] Expanded automated tests for client transport, round transitions and UI state.
- [ ] Contributor guide, issue triage and a small set of good first issues.
- [ ] Architecture decision records for the authoritative server and deployment model.
- [ ] Public demo telemetry that respects privacy and contains no personal data.
