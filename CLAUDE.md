# CLAUDE.md — Atlas Core working rules

Future Claude sessions working in this directory: read this file before
editing. These rules are extracted from the Tether WDK official docs
(`https://docs.wdk.tether.io/`), the reference protocol module
(`../wdk-protocol-bridge-usdt0-evm/`), and the resolved decisions in
`QUESTIONS.md`. Cite the rule number in PR messages when applying or
overriding one.

---

## 1. Project context

- **Atlas Core** is a Tether WDK *protocol* module (not a wallet module)
  that normalises cross-chain swap and bridge routing.
- It ships **types, constants, errors, and one abstract class**
  (`AtlasProtocol`). Every abstract method throws
  `AtlasNotImplementedError`. **No runtime code, no aggregator
  adapters in this package.** Adapters (Rango, LayerZero, Jupiter, …)
  live in sibling packages and extend `AtlasProtocol`.
- Target consumers: WDK wallets that need to offer cross-chain swap /
  bridge UX. Atlas hands back signed-and-ready transactions; the WDK
  wallet account signs and broadcasts them.

---

## 2. Numeric / amount rules (READ FIRST)

These are the rules most likely to be violated by drive-by edits.

### 2.1 `bigint` is the only on-the-wire amount type — never `number`, never `string` (except at JSON boundary)

JavaScript `BigInt` is arbitrary precision (ECMA-262 §6.1.6.2). It does
not overflow at any decimal count. Concretely:

- A 26-decimal token with 10B max supply → 10^36 base units → trivial
  for `BigInt`.
- 18-decimal ETH balances above ~0.01 ETH already exceed `2^53`. JS
  `number` (IEEE 754) silently *loses precision* in that range —
  `number` would be **wrong**, not `BigInt`.
- The "BN overflow" intuition from EVM tooling is about 256-bit on-chain
  words. JavaScript's `BigInt` is wider than any on-chain word size we
  use.

If anyone asks "why not use BN.js / BigNumber / strings": the answer is
SCHEMA.md § "Why `bigint` for amounts". Adapters needing those libraries
convert at the call site (`BN.from(x.toString())` etc.) — Atlas does
not ship a wrapper.

### 2.2 Public input boundary accepts `AmountInput = number | bigint`

The WDK bridge reference accepts `number | bigint` and coerces with
`BigInt(x)` internally (see
`wdk-protocol-bridge-usdt0-evm/src/usdt0-protocol-evm.js:100,143`).
Atlas matches: `QuoteInput.amountSource` is typed as `AmountInput`. The
abstract / adapter coerces to `AmountBase` (`bigint`) immediately.

- Callers MAY pass a `number` for small amounts (≤ `2^53 - 1`).
- Callers MUST use `bigint` for any amount that may exceed
  `Number.MAX_SAFE_INTEGER`. Adapters do not need to detect this —
  the caller owns the responsibility.

### 2.3 No floating-point math in any type contract

Slippage is `BasisPoints` (integer 0–10_000). USD hints are
`AmountUsdMicros` (`bigint`, 1e6 micro-USD = 1 USD). For display,
slice the decimal-string form — never divide a `bigint` by `1e6` in
float arithmetic.

### 2.4 All `bigint` amounts are non-negative

There is no representation of a negative balance. If a value can be
negative, model it as a `kind` discriminator + a non-negative amount.

### 2.5 JSON boundary: bigint → decimal string

`JSON.stringify` does not handle `bigint`. When Atlas types cross a
JSON boundary (RPC, IPC, storage): encode every `bigint` as a decimal
string (no `0x`, no scientific). Decode immediately on the receiving
side. Atlas Core v1 ships no codec; SCHEMA.md is the authoritative
reference.

### 2.6 Branded primitives are type-level only

`AmountBase`, `ChainRef`, etc. carry a `__brand` phantom. There is no
runtime check. Adapters receiving external input MUST validate
(`typeof x === 'bigint' && x >= 0n` for amounts) before casting.

---

## 3. WDK rules that apply to this package

From `https://docs.wdk.tether.io/llms.txt`, `llms-full.txt`, the
reference module, and the WDK `AGENTS.md` checklist.

### 3.1 File and class naming

- Filenames: **kebab-case**. Examples: `atlas-protocol.js`,
  `wallet-manager-evm.js`.
- Class names: **PascalCase**. Examples: `AtlasProtocol`,
  `WalletManagerEvm`.
- Private members: leading `_` AND `@private` JSDoc tag. Note: WDK
  marks even fields read from subclasses as `@private`; subclass
  access still works at runtime (JSDoc is non-enforcing). Don't change
  to `@protected` even when it would feel "more correct" — match WDK.

### 3.2 Module format

- **ESM only** — `"type": "module"` in `package.json`. No CommonJS.
- **Explicit `.js` extension on every import**. Mandatory for Node ESM
  and Bare runtime.
- **Apache-2.0 header** at the top of every `.js` file.

### 3.3 Public exports

- Protocol modules export a **default class** that extends a WDK base
  class (`BridgeProtocol`, `SwapProtocol`, …). Atlas Core itself is
  the base for routing protocols — it does NOT extend a WDK base
  because none exists yet for routing — but every adapter MUST extend
  `AtlasProtocol` and remain a default export.
- `index.js` re-exports `default` AND the named class for ergonomic
  imports (`import Atlas from '…'` and `import { AtlasProtocol } from '…'`).
- Named exports for typedefs / constants / errors. No `export *`
  bundles, no top-level side effects.

### 3.4 Bare runtime

- Ship a `bare.js` that does:
  ```js
  import 'bare-node-runtime/global'
  export * from './index.js' with { imports: 'bare-node-runtime/imports' }
  export { default } from './index.js' with { imports: 'bare-node-runtime/imports' }
  ```
- `bare-node-runtime` is the **only** runtime dependency Atlas Core
  needs. Add it to `dependencies`, not `devDependencies`.
- Do **not** use Node-only globals in type contracts (no `Buffer` —
  use `Uint8Array`).

### 3.5 Constructor convention

- Protocol classes take `(account, config = {})`.
- `account` is duck-typed as `AtlasWalletAccountLike` in Atlas Core
  (because we can't depend on `@tetherto/wdk-wallet*`). Concrete
  adapters narrow this to the specific WDK wallet account variant.
- `config` is a plain object, every field optional, sensible defaults.

### 3.6 JSDoc → tsc → `.d.ts`

- **No hand-written `.d.ts`.** JSDoc on `.js` is the source of truth;
  `npm run build:types` emits `./types/index.d.ts` via `tsc`.
- `tsconfig.json` mirrors the reference module: `allowJs`,
  `emitDeclarationOnly`, `stripInternal`, `outDir: ./types`.
- Mark internal ABIs / helpers with `@internal` so `stripInternal`
  removes them from emitted `.d.ts`.

### 3.7 Documentation

- Every public symbol has at least one-line JSDoc. Methods and
  typedefs have full `@param` / `@returns` / `@throws`.
- README has a quick-start usage example. SCHEMA.md is the canonical
  narrative for every public type, units, invariants, and error
  semantics.

### 3.8 Scope and publishing

- Production scope is `@tetherto/*`. Current placeholder is
  `@unify-verse/atlas-core` (Q20). Confirm with Tether before tagging
  v1.

---

## 4. Atlas-specific design rules (resolved per QUESTIONS.md)

If any of these change, update QUESTIONS.md AND this section.

- **Atomicity (Q1)**: Never claim atomicity across legs.
  `partially_completed` is a first-class terminal status; populate
  `RouteExecution.recoverableLegs[]`.
- **Quote freshness (Q2)**: `Quote.expiresAtUnixSec` is mandatory.
  `prepare()` past expiry throws `AtlasQuoteExpiredError`. No auto
  re-pricing.
- **Slippage (Q3)**: end-to-end `slippageBps` is the caller knob;
  per-leg `minAmountOut` is read-only audit data.
- **State ownership (Q4)**: WDK wallet owns nonces/gas/signing/broadcast.
  Atlas owns *exact* approval amounts — never infinite.
- **Fees (Q5)**: discriminated union over `FeeKind`. `usd` is
  informational only, never load-bearing.
- **Chain identity (Q6)**: CAIP-2 `ChainRef`. `KnownChain` is a
  starter set; unknown chains rejected at the adapter boundary.
- **Route correlation (Q7)**: provider-bound `ProviderRouteId`,
  optional caller `correlationId` for telemetry.
- **Provider selection (Q8)**: Atlas recommends in `Quote.route`,
  alternatives in `Quote.alternatives[]`.
- **Status taxonomy (Q9)**: full 12-state closed set. See SCHEMA.md
  for transitions.
- **Errors (Q10)**: severity axis only (`retryable` / `investigate` /
  `funds_at_risk` / `provider_broken`); no `retryable: boolean`
  shortcut.
- **Approvals (Q11)**: opaque `kind` + `transaction` for v1.
- **Transactions (Q12)**: tagged union, no third-party types in
  public surface, no `Buffer`.
- **Tests (Q13)**: brittle. WDK reference uses Jest — see § 5.
- **Deadline vs expiry (Q14)**: both, distinct, documented.
- **Read-only vs signing (Q15)**: `quote`/`getStatus` accept
  read-only; `prepare` requires signing.
- **Clock & logger (Q16)**: injected via config, sensible defaults.
- **JSON / bigint (Q17)**: no codec in v1.
- **Fee cap (Q18)**: per-route `maxFeeNative` only; no per-leg cap.
- **Scope (Q19)**: zero adapter code in v1.
- **Name (Q20)**: `@unify-verse/atlas-core` placeholder.

---

## 5. Known divergences from WDK reference (intentional)

| Topic | WDK reference | Atlas Core | Why |
|---|---|---|---|
| Test framework | Jest | **brittle** | Grant draft mandates brittle. WDK rules note Jest, but for protocol-routing this stricter framework was chosen by the grant. |
| Errors | Plain `throw new Error('...')` | Typed hierarchy with `code` + `severity` | Atlas surfaces routing errors to wallets that need granular UX (retry vs surface vs funds-at-risk). Plain strings collapse this signal. |
| `package.json` `sideEffects` | omitted | `false` | Atlas is tree-shakeable type-only at the Node entry; declaring this lets bundlers prune dead exports. |
| `package.json` `files` | omitted | allowlist (`index.js`, `bare.js`, `src/`, `types/`, docs, LICENSE) | Atlas avoids accidentally publishing test fixtures or local config. |
| `chains` config shape | `{ ['ethereum']: { ... } }` (chain *name* key) | `Readonly<Record<ChainRef, ChainConfig>>` (CAIP-2 ref key) | CAIP-2 is unambiguous across namespaces; chain names collide ("avalanche" → C-chain vs P-chain etc.). |
| Error codes | none | closed `AtlasErrorCode` enum | Required by SCHEMA's promise that callers can switch on `code` for display + on `severity` for retry. |
| Scaffolding via `@tetherto/create-wdk-module` | mandated | not used | Atlas Core was hand-built per the grant brief (M1 design deliverable). Future adapter packages SHOULD use the scaffolding tool. |

Document any new divergence here with rationale. Reviewers will compare
side-by-side against the reference.

---

## 6. Critical "do not" list

Things that have bitten somebody and shouldn't bite the next person.

- **DO NOT** add `number` as an amount type beyond the
  `AmountInput = number | bigint` boundary typedef. Anything stored or
  passed downstream is `bigint`.
- **DO NOT** make approvals "infinite" by default. Approval `amount`
  is always the exact value the route requires.
- **DO NOT** broadcast an `Approval` whose `kind === 'noop'`.
- **DO NOT** introduce `Buffer` into any public typedef. Use
  `Uint8Array` for raw bytes. Atlas must stay Bare-runtime compatible.
- **DO NOT** add runtime dependencies beyond `bare-node-runtime`. Any
  third-party type the public surface needs should be redefined
  locally as a typedef.
- **DO NOT** convert error severities to a boolean `retryable`. The
  four-value axis is the contract (`retryable` / `investigate` /
  `funds_at_risk` / `provider_broken`).
- **DO NOT** silently re-quote a route whose `expiresAtUnixSec` has
  passed. Throw `AtlasQuoteExpiredError`; the caller chooses whether
  to re-quote.
- **DO NOT** rename `quote` / `prepare` / `getStatus`. These names
  are public surface; renaming breaks every adapter.
- **DO NOT** add a typedef to `src/types.js` without re-exporting it
  via JSDoc in `index.js`. The `exhaustive.test.js` suite will catch
  drift but only at test time.
- **DO NOT** bump `ATLAS_PROTOCOL_VERSION` without bumping
  `package.json.version` to match. `tests/version-sync.test.js`
  enforces this; respect it.

---

## 7. Verification commands

After any change:

```sh
npm run lint            # standard JS, zero warnings
npm run build:types     # tsc → types/, no `any` in emitted .d.ts
npm test                # brittle, all tests pass
```

If lint fails, fix the root cause; do not add `// eslint-disable`
without an inline comment explaining why no clean alternative exists.

---

## 8. References

- WDK docs: https://docs.wdk.tether.io/
  - llms.txt: https://docs.wdk.tether.io/llms.txt
  - llms-full.txt: https://docs.wdk.tether.io/llms-full.txt
- Scaffolding tool: `npx @tetherto/create-wdk-module@latest`
- Reference module: `/Users/alex/Workspace/ppool/tethergrants/wdk-protocol-bridge-usdt0-evm/`
- Atlas grant draft: `/Users/alex/Workspace/ppool/tethergrants/tether-wdk-grant-draft.md`
- Atlas design prompt: `/Users/alex/Workspace/ppool/tethergrants/atlas-design-prompt.md`
- WDK module spec PDF: `/Users/alex/Workspace/ppool/tethergrants/WDK-Module.pdf`
