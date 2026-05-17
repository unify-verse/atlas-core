# Atlas Core — Next Steps

The M1 design deliverable is complete (types, constants, errors,
abstract `AtlasProtocol`, SCHEMA.md, QUESTIONS.md, tests). This
document is the runbook from here to "shipped and consumed by another
WDK module".

---

## Phase A — Pre-publish hardening (today)

Local, do this first whether you're going private or public.

1. **Resolve QUESTIONS.md with the reviewer.** Every entry has a
   recommended answer (R). Walk through with the Tether reviewer and
   annotate each section with `**Resolved (YYYY-MM-DD):** <decision>`.
   No entry should remain ambiguous before adapters start.

2. **Confirm the npm scope.** Today the package name is
   `@unifyverse/atlas-core` (placeholder, Q20). Decide one of:
   - Stay `@unifyverse/atlas-core` (publish under your scope).
   - Move to `@tetherto/wdk-atlas-core` (publish under Tether).
   - Move to a private scope (e.g. `@unifyverse-internal/atlas-core`).

   Edit `package.json` `name` accordingly. **Do not** publish until
   this is settled — the scope is part of the import path every
   adapter and wallet will hardcode.

3. **Set up local git.** This directory is not currently a git repo
   (verified at the start of the session). Initialise:
   ```sh
   cd /Users/alex/Workspace/ppool/tethergrants/first-module-impl
   git init -b main
   git add .
   git commit -m "Atlas Core M1 — initial design deliverable"
   ```

4. **Create the GitHub repo.** Match the npm scope decision:
   - Public: `github.com/<org>/atlas-core` (Apache-2.0 already in
     `LICENSE`).
   - Private: same, but mark the repo private. Adjust the repo URL
     in `package.json` (`repository`, `bugs`, `homepage`).

5. **CI**: add a minimal GitHub Actions workflow that runs
   `npm ci && npm run lint && npm run build:types && npm test` on push
   to `main` and on every PR. Reference module's `.github/workflows`
   is a good template if present; otherwise the three commands above
   in a 20-line workflow are sufficient.

---

## Phase B — Private publish (recommended first step)

This lets one or two internal adapter packages depend on Atlas Core
without committing to a public version.

### Option B1 — GitHub Packages registry (recommended for Tether ecosystem)

1. Add to `package.json`:
   ```jsonc
   "publishConfig": {
     "access": "restricted",
     "registry": "https://npm.pkg.github.com/"
   }
   ```
2. The package `name` must include the GitHub org/user as the npm
   scope. Example: `@unifyverse/atlas-core` published to GitHub will
   live at `npm.pkg.github.com/@unifyverse/atlas-core`.
3. Create a GitHub Personal Access Token with `write:packages` and
   `read:packages` scopes. Save to `~/.npmrc`:
   ```ini
   //npm.pkg.github.com/:_authToken=ghp_xxx
   @unifyverse:registry=https://npm.pkg.github.com/
   ```
4. From the repo: `npm publish`. The `prepublishOnly` script (if
   added) should run `npm run lint && npm run build:types && npm test`
   first — add this:
   ```jsonc
   "scripts": {
     ...,
     "prepublishOnly": "npm run lint && npm run build:types && npm test"
   }
   ```
5. Consumers add the same `@unifyverse:registry` line and the same
   token (read-only scope) to install.

### Option B2 — Private npm registry (Verdaccio, JFrog, npm Enterprise)

Same `publishConfig.registry` URL pointing to your internal registry,
and an org-wide auth token. The flow is otherwise identical.

### Option B3 — Git URL install (zero-infra)

For one-off consumption without setting up a registry. From the
consuming package:
```sh
npm install git+ssh://git@github.com/<org>/atlas-core.git#<tag>
```
The `package.json` `files` allowlist already excludes `node_modules`,
`tests/`, and the agent definitions. **However**: `tsc`-generated
`types/` will only ship if you commit it OR add a postinstall step.
The cleanest path is to commit `types/` to the repo *only on tagged
releases* — keep `types/` in `.gitignore` on `main`.

This is the lowest-friction option and good for the first 1–2
adapters. Migrate to a registry once you have ≥ 3 consumers.

---

## Phase C — Public publish (when Atlas Core is stable)

1. Confirm Q20 (scope). If Tether allocates `@tetherto/*`, rename
   the package, update every internal consumer, and reserve the npm
   name immediately even if you don't publish yet.
2. Bump to `1.0.0` per SCHEMA.md § "Compatibility & versioning". GA
   tightens the rules: any addition to closed-set constants
   (`AtlasStatus`, `AtlasErrorCode`, …) becomes a major version bump
   because callers exhaustively switch on them.
3. Set `publishConfig.access` to `"public"` and
   `publishConfig.registry` to `https://registry.npmjs.org/`.
4. Run `npm publish --otp <code>` from an authenticated terminal.
   The 2FA OTP is required for the first publish under a new scope.
5. Tag the git release: `git tag v1.0.0 && git push --tags`.
6. Update CI to run `npm publish` on tag push if you want hands-off
   releases later — but for first release, do it manually so you can
   verify the published tarball with `npm pack` first.

---

## Phase D — Consume Atlas Core from another WDK module

This is the integration recipe for a wallet package
(e.g. `@unifyverse/wdk-wallet-evm-cross-chain`) or an adapter package
(e.g. `@unifyverse/atlas-adapter-rango`).

### D.1 Install

Registry-based:
```sh
npm install @unifyverse/atlas-core
```

Git-based (Phase B3):
```sh
npm install git+ssh://git@github.com/<org>/atlas-core.git#v0.1.0-alpha.0
```

### D.2 Adapter package — what to write

Create `src/rango-protocol.js` (kebab-case, mirroring the bridge
reference):

```js
'use strict'

import AtlasProtocol, {
  AtlasInvalidInputError,
  AtlasQuoteExpiredError,
  AtlasProviderUnavailableError,
  AtlasProviderError,
  ApprovalKind,
  TransactionKind,
  FeeKind,
  AtlasStatus
} from '@unifyverse/atlas-core'

/** @typedef {import('@unifyverse/atlas-core').QuoteInput} QuoteInput */
/** @typedef {import('@unifyverse/atlas-core').Quote} Quote */
/** @typedef {import('@unifyverse/atlas-core').Route} Route */
/** @typedef {import('@unifyverse/atlas-core').RoutePreparation} RoutePreparation */
/** @typedef {import('@unifyverse/atlas-core').RouteExecution} RouteExecution */

export default class RangoProtocol extends AtlasProtocol {
  /**
   * @param {import('@tetherto/wdk-wallet-evm').WalletAccountEvm} account
   * @param {import('@unifyverse/atlas-core').AtlasProtocolConfig & { apiKey: string }} config
   */
  constructor (account, config) {
    super(account, config)

    /** @private */
    this._client = /* construct your HTTP client */ null
  }

  /** @returns {Promise<Quote>} */
  async quote (input) {
    // coerce amountSource: AmountInput (number|bigint) -> bigint
    const amount = BigInt(input.amountSource)
    // ... fetch from provider, map response to Quote shape per SCHEMA.md ...
    // throw AtlasInvalidInputError / AtlasProviderUnavailableError as needed
  }

  /** @returns {Promise<RoutePreparation>} */
  async prepare (route) {
    // refuse on expired, refuse on read-only account, enforce maxFeeNative
    // ... build approvals[] + per-leg transactions[] ...
  }

  /** @returns {Promise<RouteExecution>} */
  async getStatus (providerRouteId) {
    // ... map provider status to AtlasStatus closed set ...
    // populate recoverableLegs if partially_completed
  }
}
```

Adapter package `package.json` essentials:

```jsonc
{
  "name": "@unifyverse/atlas-adapter-rango",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "@unifyverse/atlas-core": "^0.1.0-alpha.0",
    "@tetherto/wdk-wallet-evm": "^1.0.0-beta.12",
    "bare-node-runtime": "^1.1.4",
    "ethers": "6.13.5"
  },
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "bare": "./bare.js",
      "default": "./index.js"
    }
  }
}
```

### D.3 Wallet integration — how end users see it

```js
import RangoProtocol from '@unifyverse/atlas-adapter-rango'
import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'

const wallet = /* construct your WDK wallet account */ null
const atlas = new RangoProtocol(wallet, { apiKey: process.env.RANGO_KEY })

const { route, alternatives, expiresAtUnixSec } = await atlas.quote({
  fromAsset: { chain: 'eip155:1',     address: USDT_ETH, decimals: 6, symbol: 'USDT' },
  toAsset:   { chain: 'eip155:42161', address: USDT_ARB, decimals: 6, symbol: 'USDT' },
  amountSource: 1_000_000n,
  fromAddress: await wallet.getAddress(),
  toAddress:   await wallet.getAddress(),
  preferences: { slippageBps: 50, optimiseFor: 'output' }
})

const prep = await atlas.prepare(route)

for (const a of prep.approvals) {
  if (a.kind === 'noop') continue
  await wallet.send(a.transaction)
}
for (const leg of prep.route.legs) {
  for (const tx of leg.transactions) {
    await wallet.send(tx)
  }
}

const exec = await atlas.getStatus(prep.providerRouteId)
```

See SCHEMA.md § "Worked example: end-to-end swap" for the full
walkthrough including status polling and `partially_completed`
recovery.

---

## Phase E — Versioning policy after first publish

- `0.x.y-alpha.*` pre-release: anything may break. No SLA for
  consumers.
- `0.x.y` minor pre-release (no `-alpha`): breaking changes allowed
  per semver minor on `0.x.y`. Document each in a CHANGELOG.
- `1.0.0` GA: SCHEMA.md compatibility rules apply. Any addition to
  `AtlasStatus`, `AtlasErrorCode`, `ApprovalKind`, `FeeKind`,
  `ChainNamespace`, `Optimisation`, `TransactionKind`, or any change
  to `AtlasProtocol`'s abstract surface or any public typedef is a
  **major** version bump.
- Patch releases: bug fixes only. Do not introduce new typedefs even
  as additions in a patch.
- Bump `src/constants.js` `ATLAS_PROTOCOL_VERSION` to match
  `package.json.version` on every release —
  `tests/version-sync.test.js` enforces this.

---

## Phase F — Migration of WDK conventions you intentionally diverged from

Three CLAUDE.md-documented divergences will surface in reviews:

1. **brittle vs Jest.** WDK reference modules use Jest. Atlas uses
   brittle per the grant draft. If you migrate to Jest later, swap
   the `tests/*.test.js` files (the assertions translate directly:
   `t.is`/`t.ok`/`t.alike` → `expect(...).toBe`/`.toBeTruthy`/
   `.toEqual`).

2. **Typed errors vs plain `Error`.** WDK reference throws plain
   strings. Atlas's typed hierarchy is a deliberate upgrade. If a
   reviewer pushes back, the rationale is in CLAUDE.md § 5 and
   QUESTIONS.md Q10.

3. **`sideEffects: false` + `files` allowlist.** WDK omits both;
   Atlas includes both for bundler tree-shaking and clean publish
   output. Document if challenged.

If Tether's review forces alignment with WDK on any of these, the
change is mechanical — the typed errors are the largest, and even
that's a `git mv` + global rename.

---

## Phase G — When to break ground on adapters

Don't write an adapter until:
- Phase A is done (questions resolved).
- The first adapter target (Rango or LayerZero) has its API
  documented (their public quote/route/track endpoints).
- You have at least one concrete end-to-end test scenario in mind:
  e.g. "USDT Ethereum → USDT Arbitrum, 1 USDT, slippage 0.5 %".

The adapter is where the real complexity lives — Atlas Core just
gave it a typed contract to fill in.
