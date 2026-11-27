# Roadmap

This is a living plan, not a promise of dates. The project is currently maintained by one person; a friend may help later. Issues and pull requests are welcome.

Track progress on the public [MOVESTOP Roadmap board](https://github.com/users/luis-ota/projects/1).

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
- [ ] Rework O Relojoeiro so the final boss tops the Ronin midboss. Today he stands still and repeats one bullet pattern; the plan is a boss that bends the time rule itself:
  - phase 1: learn — parry his bullets (as today);
  - phase 2: inverted time — the world runs while the player stands still (the Estátua's rule, arena-wide);
  - phase 3: his clock — he decides when time runs, telegraphed by his clock hands;
  - he moves between the 12/3/6/9 marks of a clock drawn on the floor, and his hands become telegraphed sweeping beams;
  - his openings reuse the Ronin's language (eyes go dark, an opening mark), so players apply what they learned.
- [ ] Parry follow-ups: deflect projectiles back with intent (aimed returns), parry-only enemy shots and a guard-break on heavy hits.
- [ ] Custom levels (later, not scheduled): a grid editor and level files the campaign loader can read, sharing the level format (`LevelDef`), with validation for spawns inside walls and unreachable cells (the navigation grid already answers both).
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
