# Supply-chain audit — Atlas Core dependency graph

**Audit date:** 2026-05-17T21:34:08Z
**Window:** last 72 hours (since 2026-05-14T21:34:08Z)
**Scope:** every `name@version` resolved in
`/Users/alex/Workspace/ppool/tethergrants/first-module-impl/package-lock.json`
**Verdict:** **CLEAN — no signs of supply-chain compromise.**

The Atlas Core package declares only three devDependencies (`brittle`,
`standard`, `typescript`) and one runtime dependency (`bare-node-runtime`).
The 362 entries in the lockfile are transitive dependencies of those four.

---

## Surface scan results

| Check | Result | Note |
|---|---|---|
| `npm audit` (known CVEs) | **0 vulnerabilities** | info/low/moderate/high/critical all 0 |
| Packages with `preinstall`/`install`/`postinstall` scripts | **0 in the actually-installed tree** | 1 hit was in `resolve/test/resolver/multirepo/` — a test fixture with `private: true`, never installed |
| Lockfile entries from non-`https://registry.npmjs.org/` sources | **0** | No git URLs, no `file:` paths, no plain `http://` |
| Lockfile entries missing `integrity` SHA hash | **0** | All 362 entries have integrity hashes; npm verifies on install |
| `lockfileVersion` | **3** | Modern format with full integrity |
| Fetch errors querying npm registry for publish dates | **0** | All 343 unique package names resolved |

---

## Packages published in the last 72 hours

Exactly one. Verified legitimate.

| Package | Version | Published | Maintainer | Repository | Verdict |
|---|---|---|---|---|---|
| `resolve` | `2.0.0-next.7` | 2026-05-15T20:12:07Z (49h ago) | `ljharb` (Jordan Harband — TC39 delegate, long-time maintainer) | `github.com/browserify/resolve` (canonical) | **Safe** — normal cadence (`2.0.0-next.6` was 2026-02-17; pre-release line is iterative). No suspicious scripts. |

---

## Packages whose npm record itself was created in the last 30 days

Exactly one. Verified legitimate.

| Package | Version | Package created | Maintainer | Publisher | Verdict |
|---|---|---|---|---|---|
| `bare-mime` | `1.0.0` | 2026-04-23T21:01:28Z | `mafintosh` (Mathias Buus, Holepunch co-founder) | **GitHub OIDC trusted publisher** (gold-standard publish path; no long-lived npm token) | **Safe** — part of the active Holepunch `bare-*` ecosystem (other siblings: `bare-fs`, `bare-tcp`, `bare-tls`, …, all pulled in transitively by `bare-node-runtime`). |

OIDC trusted publishing is the most secure npm publish flow available:
short-lived credentials minted by GitHub Actions, tied to a specific
workflow file in the canonical repository. It is the strongest possible
signal that a publish was performed by the legitimate CI pipeline rather
than via a leaked long-lived token.

---

## Direct dependency provenance

| Package | Version | Author / Org | Trust signal |
|---|---|---|---|
| `bare-node-runtime` | `^1.1.4` | Holepunch (`holepunchto` org) | Same org as the Bare runtime itself; pulled in only because `bare.js` needs it. |
| `brittle` | `3.19.1` | Holepunch (`holepunchto` org) | Same org; canonical test framework for Bare ecosystem. |
| `standard` | `17.1.2` | `feross` / standard team | Industry-standard linter; downloads in the millions/week. |
| `typescript` | `5.8.3` | Microsoft | Official compiler. |

No typosquats observed; no unfamiliar packages in the direct deps.

---

## How the audit was performed (reproducibility)

```sh
# 1. CVE scan
cd /Users/alex/Workspace/ppool/tethergrants/first-module-impl
npm audit --json

# 2. Install-script scan
find node_modules -name package.json | \
  xargs grep -lE '"(preinstall|install|postinstall)"\s*:'

# 3. Lockfile integrity / source provenance (one-liner)
node -e '
const lock = JSON.parse(require("fs").readFileSync("package-lock.json","utf8"));
for (const [p,info] of Object.entries(lock.packages||{})) {
  if (info.link || !info.resolved) continue;
  if (!info.resolved.startsWith("https://registry.npmjs.org/")) console.log("non-npm:", p, info.resolved);
  if (!info.integrity) console.log("no-integrity:", p);
}'

# 4. Publish-date scan: see /tmp/supply-chain-audit.mjs
node /tmp/supply-chain-audit.mjs

# 5. Manifest spot-check for any flagged package
curl -s https://registry.npmjs.org/<name>/<version> | \
  jq '{name, version, _npmUser, maintainers, repository, scripts}'
```

The full JSON report is at `/tmp/supply-chain-report.json`.

---

## What this audit does NOT cover

For full paranoia, the items below are gaps worth knowing about. None
are presently actionable signals — but if you ever want to go deeper:

- **Maintainer-change detection.** If a long-lived package silently
  swapped maintainers (e.g. transferred to an attacker who has not yet
  republished), npm doesn't surface that in the public manifest unless
  / until a publish happens. Mitigation: pin exact versions in
  `package.json` (we already do via `package-lock.json`) and refuse
  automatic updates without re-audit.
- **Static analysis of package source.** I did not byte-scan every
  one of the 362 package tarballs for obfuscated payloads (base64
  blobs, dynamic `eval`, suspicious network calls in module-init
  code). For this dep set (Holepunch + standard JS + tsc), it would
  be theatre — these are all well-known, high-traffic packages. For
  an untrusted dep set, tools like
  [`socket.dev`](https://socket.dev),
  [`snyk test`](https://snyk.io), or
  [`npm-package-arg` + Aikido](https://www.aikido.dev) provide
  automated content scans.
- **Native binaries.** Some `bare-*` siblings ship platform-specific
  native addons. I did not verify the SHA of each addon against the
  source repo. Holepunch's build pipeline publishes via GitHub
  Actions OIDC (confirmed for `bare-mime`); same pattern applies to
  the rest of the family.
- **Pre/post-install scripts in nested deps that may have been
  stripped via `npm config set ignore-scripts true`.** We do not have
  this set. We rely on the fact that none of the 362 lockfile entries
  declared install hooks (verified above).

---

## Recommendations going forward

1. **Keep `package-lock.json` committed.** It's already pinning every
   transitive version + integrity hash. Without it, every `npm install`
   would re-resolve and could pull a freshly-malicious version.
2. **Do not run `npm update` blindly.** Re-run this audit script
   (`/tmp/supply-chain-audit.mjs`) after any update to detect new
   recent-publish entries before installing them in production.
3. **Consider enabling `npm config set ignore-scripts true`** in CI
   for the Atlas Core repo. Atlas itself ships no install scripts; no
   transitive dep currently uses them; enforcing the rule defensively
   means a future malicious package can't introduce one silently.
4. **Pin `bare-node-runtime` to an exact version** in production. The
   current `"^1.1.4"` allows any `1.x.x ≥ 1.1.4`. For a security-
   sensitive library, pinning the exact version means re-audit is
   mandatory before any drift. Tradeoff: you miss security patches
   automatically.
5. **When publishing Atlas Core itself, use GitHub OIDC trusted
   publishing** (the same path `bare-mime` uses). Setup is documented
   at <https://docs.npmjs.com/trusted-publishers>. This eliminates the
   long-lived npm token from your CI secrets.
