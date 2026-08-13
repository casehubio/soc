## D1: Ganglion intelligence level

**Choice:** Simple classifier with scoring SPI — flat DETECTED/0.9 by default, `BruteForceScorer` SPI in `api/` for future enrichment (account type, source IP, time-of-day) via CDI displacement
**Alternatives:**
- Simple classifier only — no extension point, hardcoded confidence
- Enriched classifier — variable confidence built into the Ganglion itself, no SPI boundary
**Rationale:** Clean separation between event classification (Ganglion) and confidence scoring (SPI). Enrichment is a Layer 1 concern that evolves independently.
**Trade-offs:** One extra interface + default impl for a feature that may never be enriched beyond the default.
**Exploration:** quick
**Status:** captured

## D2: CloudEvent types handled

**Choice:** Broader auth events — `soc.alert.auth.failed-login`, `soc.alert.auth.failed-mfa`, `soc.alert.auth.account-lockout`, `soc.alert.auth.password-spray`
**Alternatives:**
- Auth failure events only (failed-login, failed-mfa) — narrower scope
- Single generic type with internal classification — loses upstream SIEM classification
**Rationale:** SIEM/EDR systems already classify event subtypes. The Ganglion should accept what they send rather than re-classifying.
**Trade-offs:** More event types means more situation registrations to test.
**Exploration:** quick
**Status:** captured

## D3: Correlation key strategy

**Choice:** Two situation definitions — `soc-brute-force-by-source` (correlate by source IP) and `soc-credential-stuffing-by-target` (correlate by target account). Same Ganglion, different correlation keys and thresholds.
**Alternatives:**
- Source IP only — misses credential stuffing pattern
- Target account only — misses distributed brute force
**Rationale:** Two distinct attack patterns. Each needs its own correlation key, threshold, and window. The Ganglion is shared — the situation YAML handles the differentiation.
**Trade-offs:** Two situation definitions to maintain. Two case types to handle downstream (or one shared case type with different context).
**Depends on:** D2 (same event types feed both situations)
**Exploration:** quick
**Status:** captured

## D4: Thresholds and configuration

**Choice:** Configurable via PreferenceKey with defaults — brute-force: 5 failures in 5min, credential stuffing: 3 failures in 1hr. Thresholds readable from preferences so tenants can tune.
**Alternatives:**
- Fixed defaults only (5/5min for both) — simple but inflexible
- Hardcoded differentiated (5/5min + 3/1hr) — right defaults, no tenant tuning
**Rationale:** SOC deployments serve different organisations with different security postures. A financial institution may want a threshold of 3; a consumer app may tolerate 10.
**Trade-offs:** PreferenceKey integration requires the preference provider to be available at situation evaluation time.
**Depends on:** D3 (two situations with different defaults)
**Exploration:** quick
**Status:** captured
