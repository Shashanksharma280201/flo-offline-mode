---
phase: 1
slug: container-infrastructure-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `pnpm test:infra` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:infra`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | INFRA-06 | integration | `pnpm test:health` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | INFRA-01 | integration | `docker-compose config --quiet` | ✅ | ⬜ pending |
| TBD | TBD | 1 | INFRA-02 | integration | `docker images \| grep flo-offline-mode` | ✅ | ⬜ pending |
| TBD | TBD | 1 | INFRA-03 | integration | `pnpm test:shutdown` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | INFRA-04 | integration | `pnpm test:mongodb-config` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | INFRA-05 | integration | `pnpm test:redis-config` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/infra/health.test.ts` — health check endpoint verification
- [ ] `tests/infra/shutdown.test.ts` — graceful shutdown signal handling
- [ ] `tests/infra/mongodb-config.test.ts` — MongoDB WiredTiger cache configuration
- [ ] `tests/infra/redis-config.test.ts` — Redis noeviction policy verification
- [ ] `vitest.config.ts` — test framework configuration
- [ ] `package.json` — add test scripts (test, test:infra, test:health, test:shutdown, test:mongodb-config, test:redis-config)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Container restarts preserve MongoDB data | INFRA-01, DATA-04 | Requires docker-compose down/up cycle | 1. Start containers<br>2. Insert test document in MongoDB<br>3. `docker-compose down && docker-compose up -d`<br>4. Verify document still exists |
| Image size under 500MB | INFRA-02 | Requires docker build completion | Run `docker images flo-offline-mode:latest` and verify SIZE column < 500MB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
