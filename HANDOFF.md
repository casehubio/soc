# HANDOFF — casehub-soc

**Date:** 2026-06-30
**Branch:** main (issue-1-infra-chores closed and stamped)
**Issues:** #1, #2, #3, #4, #5 all closed

---

## What happened

Closed the `issue-1-infra-chores` branch. Delivered: CI workflow (publish.yml matching ledger/work pattern), commit-msg hook enforcing issue refs, ARC42STORIES.MD moved to project root, CLAUDE.md routing fix, and casehubio.github.io website entries for SOC. Issue #2 (BOM) was already done. Filed upstream issues for remaining cross-repo items.

---

## What's next

**Cross-repo (filed, pending):**
- casehubio/engine#613 — add `soc` to downstream CI dispatch list
- casehubio/parent#334 — README badge + docs/index.html APP_REPOS entry
- casehubio/fsitrading#9, #10, #11 — equivalent infra setup for fsitrading
- casehubio/engine#623 — add `fsitrading` to downstream CI dispatch list

**SOC feature work:**
- **Epic 2: Incident Triage & Case Lifecycle** — next feature epic per ARC42STORIES.MD
- **Platform gap:** `SituationStore` implementation needed in casehub-ras before full integration testing

---

## State

| Item | Status |
|------|--------|
| main | up to date with origin/main |
| issue-1-infra-chores | closed, stamped, pushed |
| Working tree | clean (untracked: .claude/) |
| Build | passing (mvn install -DskipTests) |
| casehubio.github.io | SOC entries committed, not pushed |
