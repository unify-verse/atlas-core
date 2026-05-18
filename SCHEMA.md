# Atlas Core — Public Data Model

This document is the canonical narrative of every public type Atlas
Core exports. It is the contract every adapter must satisfy. A reader
who has never seen WDK should be able to predict the shape of every
method's return value after reading this file.

If something in this file disagrees with the JSDoc in `src/`, **the
JSDoc wins** — open a PR to fix the doc.

---

## Scope

Atlas Core ships **types, constants, errors, and one abstract class**.
It does not ship a runtime, an HTTP client, an aggregator adapter, or
any cryptographic code. Zero runtime dependencies for the Node entry.
The Bare entry (`bare.js`) requires `bare-node-runtime`, which is the
only runtime dependency and is needed only when running under Bare.
Adapters live in sibling packages (`@unifyverse-exchange/atlas-adapter-rango`,
…) and import these types.

---

## Mental model

A trade in Atlas is described by three nouns:

- **Quote** — what a provider says is possible right now, and for how
  long.
- **Route** — the ordered sequence of on-chain actions inside a Quote
  that gets the user from source to destination.
- **Execution** — the running and terminal states of a Route that has
  been handed off to the chain.

A trade flows: `quote() -> prepare(route) -> caller signs and
broadcasts -> getStatus(providerRouteId)`.

A Route may span multiple chains. **Atomicity across legs is never
claimed.** A cross-chain Route can land in `partially_completed`,
meaning at least one leg succeeded but the final destination was not
reached — funds are parked on an intermediate chain. This is a
first-class terminal state, not an error.

---

## Units, time, money

| Concept              | Type                          | Notes                                                                                                              |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| On-chain amounts     | `AmountBase` (`bigint`)       | Always in the asset's base unit (wei, lamport, 6-decimal USDT unit, etc.). Never apply decimals inside Atlas types. |
| USD hints            | `AmountUsdMicros` (`bigint`)  | 1e6 micro-USD = 1 USD. **Informational only. Never load-bearing.**                                                |
| Slippage             | `BasisPoints` (`number`)      | Integer bps; 50 = 0.50 %; 10_000 = 100 %.                                                                          |
| Timestamps           | `UnixSec` (`number`)          | Whole seconds since epoch. Always UTC.                                                                             |
| Durations            | `DurationSec` (`number`)      | Whole seconds. Non-negative.                                                                                       |
| Addresses            | `AddressString` (branded)     | Canonical per chain (EVM lowercased 0x-hex; Solana base58; TON user-friendly base64url; Tron base58check).         |
| Tx hashes            | `TxHashString` (branded)      | Canonical per chain. Brand exists to stop accidental concatenation with addresses.                                 |
| Chain refs           | `ChainRef` (branded)          | CAIP-2 (`eip155:1`, `solana:5eykt4Use...`).                                                                        |
| Provider correlation | `ProviderRouteId` (branded)   | Opaque handle. Never parsed.                                                                                       |

All `bigint` amounts are **non-negative**. There is no representation
of a negative balance.

There is **no floating-point math** anywhere in Atlas types. Slippage
is in basis points; the conversion to `minAmountOut` happens inside the
provider and is surfaced as a `bigint`.

---

## Why `bigint` for amounts

JavaScript `BigInt` is arbitrary precision (ECMA-262 §6.1.6.2). There
is no overflow at any decimal count. The cases worth spelling out:

- A 26-decimal token with a 10B max supply: 10^10 tokens × 10^26 =
  10^36 base units. `BigInt` handles 10^36 trivially (the runtime
  limit is bounded by host memory, not 2^53 or 2^64).
- 18-decimal ETH balances already exceed `2^53` (≈ 9 × 10^15) above
  about 0.01 ETH. `number` (IEEE 754 double) loses **precision**, not
  just range, in that regime — i.e. `number` would silently produce
  wrong amounts, while `BigInt` produces exact ones.
- The historical "BN overflow" intuition from EVM tooling is about
  256-bit on-chain words, not about the JavaScript representation.
  `BigInt` is wider than any on-chain word size we care about.

### Input ergonomics: `AmountInput = number | bigint`

For the same reason the WDK bridge reference accepts `number | bigint`
on its public input (see
`wdk-protocol-bridge-usdt0-evm/src/usdt0-protocol-evm.js:100`,
`:143` — `{ ...options, amount: BigInt(options.amount) }`), Atlas
exposes the input as `AmountInput = number | bigint` on
`QuoteInput.amountSource`. Adapters coerce to `AmountBase` (`bigint`)
via `BigInt(x)` at the boundary before any computation. Callers may
pass a `number` literal for small amounts; they MUST use `bigint` for
anything that may exceed `Number.MAX_SAFE_INTEGER` (2^53 − 1).

### Interop at the adapter boundary

Atlas exposes `bigint` everywhere internally. Adapters that need to
hand values to libraries with their own large-integer types convert at
the call site:

- `BN.js`: `new BN(value.toString())` or `BN.from(value.toString())`.
- ethers v5 `BigNumber`: `BigNumber.from(value.toString())`.
- ethers v6 / viem: native `bigint`, no conversion needed.

`value.toString()` on a `bigint` returns a decimal string with no
prefix and no scientific notation, which all three accept. Atlas
deliberately ships no built-in adapter for these libraries — the
choice of intermediate library is the adapter's, not the protocol's.

For JSON serialisation, see "JSON boundary" below.

---

## ChainRef and chain identity

`ChainRef` is a branded string in CAIP-2 form:
`namespace:reference`, e.g. `eip155:1`, `solana:5eykt4Use...`,
`tron:0x2b6653dc`, `ton:-239`, `bip122:000000000019d6...`.

Atlas Core ships `KnownChain` constants for a starter set. Adapters
may support any other chain — they reject unknowns with
`AtlasChainUnsupportedError` at the boundary. This means **Atlas does
not maintain a master chain list** and does not need patching every
time a new chain appears.

---

## Assets

```
AssetRef {
  chain:    ChainRef
  address:  AddressString | null   // null = native asset on `chain`
  decimals: number                  // non-negative integer
  symbol:   string                  // display only; never used for matching
}
```

Two `AssetRef`s match only by `chain` + `address`. `symbol` is
informational. `decimals` is required because callers will need it for
display; Atlas never uses `decimals` internally — all internal math is
in base units.

---

## Quote lifecycle

```
QuoteInput
  fromAsset, toAsset:                 AssetRef
  amountSource:                        AmountInput      // number | bigint at the boundary; adapters coerce to AmountBase
  fromAddress, toAddress:              AddressString
  preferences?:                        PreferencesInput

Quote
  route:                               Route          // recommendation
  alternatives:                        readonly Route[]
  quotedAtUnixSec, expiresAtUnixSec:   UnixSec
  optimisedFor:                        Optimisation
  correlationId?:                      CorrelationId
```

Invariants:

- `quotedAtUnixSec <= expiresAtUnixSec`.
- `Quote.route` is one of the routes Atlas considered, with the
  best score by `Quote.optimisedFor`.
- Calling `prepare(route)` after `expiresAtUnixSec` throws
  `AtlasQuoteExpiredError` (severity `retryable` — re-quote and try
  again).

`PreferencesInput.deadlineUnixSec` is a caller-supplied "must be done
by", distinct from the provider-supplied `expiresAtUnixSec`. If a
caller's deadline is earlier than the provider's price expiry, Atlas
will refuse the quote with `AtlasInvalidInputError`.

---

## Worked example: end-to-end swap

The contract is `quote()` → `prepare()` → caller signs and broadcasts
via the WDK wallet → `getStatus()`. Atlas never signs or broadcasts.

```js
// 1. Caller prepares the input.
const input = {
  fromAsset: { chain: KnownChain.Ethereum, address: USDT_ETH_ADDR, decimals: 6, symbol: 'USDT' },
  toAsset:   { chain: KnownChain.Arbitrum, address: USDT_ARB_ADDR, decimals: 6, symbol: 'USDT' },
  amountSource: 1_000_000n,                  // 1 USDT, in base units (bigint).
                                             // A `number` literal is also accepted (AmountInput),
                                             // but use `bigint` for any value that may exceed 2^53-1.
  fromAddress: caller.address,
  toAddress:   caller.address,
  preferences: {
    slippageBps:   50,                       // 0.50 % end-to-end slippage tolerance.
    optimiseFor:   'output',
    maxFeeNative:  5_000_000_000_000_000n    // 0.005 ETH cap on summed `kind === 'native'` fees.
  }
}

// 2. Get the priced route (a Quote).
const { route, alternatives, expiresAtUnixSec, optimisedFor } = await atlas.quote(input)
// route.amountDestExpected     -- what the user gets (best case).
// route.minAmountOut           -- the floor (slippageBps applied).
// route.feesAggregated         -- all fees; branch on Fee.kind before reading variant fields.
// route.legs                   -- ordered legs; legs[i].toAsset === legs[i+1].fromAsset.

// 3. Get the executable instructions.
const preparation = await atlas.prepare(route)
// preparation.approvals[]                                  -- pre-step txns; broadcast each via wallet.send().
// preparation.route.legs[i].transactions[]                 -- main txns per leg, in broadcast order.

// 4. Sign and broadcast via the WDK wallet account. Atlas does NOT sign.
for (const approval of preparation.approvals) {
  if (approval.kind === 'noop') continue           // 'noop' approvals MUST NOT be broadcast.
  await wallet.send(approval.transaction)
}
for (const leg of preparation.route.legs) {
  for (const tx of leg.transactions) {
    await wallet.send(tx)
  }
}

// 5. Poll status until terminal.
let exec
do {
  exec = await atlas.getStatus(preparation.providerRouteId)
  await sleep(5000)
} while (!isTerminal(exec.status))

// On status === 'partially_completed', read exec.recoverableLegs[] for recovery hints.
```

The flow is the same for single-leg same-chain swaps and for multi-leg
cross-chain routes; only the number of broadcasts changes.

---

## Route and RouteLeg

```
Route
  providerRouteId:        ProviderRouteId
  provider:               ProviderId
  fromAsset, toAsset:     AssetRef
  amountSource:           AmountBase
  amountDestExpected:     AmountBase     // indicative
  minAmountOut:           AmountBase     // floor, equal to legs[last].minAmountOut
  slippageBps:            BasisPoints
  legs:                   readonly RouteLeg[]   // length >= 1
  feesAggregated:         readonly Fee[]
  expectedDurationSec:    DurationSec
  alternativesConsidered: readonly { providerId, reason }[]
```

```
RouteLeg
  index:               number
  provider:            ProviderId
  chain:               ChainRef
  fromAsset, toAsset:  AssetRef
  amountIn:            AmountBase
  amountOutExpected:   AmountBase
  minAmountOut:        AmountBase
  fees:                readonly Fee[]
  expectedDurationSec: DurationSec
  approvals:           readonly Approval[]
  transactions:        readonly UnsignedTransaction[]
  providerLegRef?:     string
```

Invariants:

- `Route.legs[0].fromAsset` matches `Route.fromAsset`.
- `Route.legs[last].toAsset` matches `Route.toAsset`.
- For every adjacent pair `(legs[i], legs[i+1])`, `legs[i].toAsset`
  matches `legs[i+1].fromAsset`.
- `Route.minAmountOut === Route.legs[last].minAmountOut`.
- `Route.legs[i].minAmountOut <= Route.legs[i].amountOutExpected`.
- `Route.expectedDurationSec = sum(legs[i].expectedDurationSec)`.

Slippage is exposed both end-to-end (`Route.slippageBps`) and
per-leg (`RouteLeg.minAmountOut`). The end-to-end value is the
caller's tuning knob; the per-leg floors are read-only for audit.

---

## Fees

`Fee` is a discriminated union over `FeeKind`. Always branch on
`kind` before reading variant fields. The variants:

| `kind`        | Field         | Type            | Meaning                                                                |
| ------------- | ------------- | --------------- | ---------------------------------------------------------------------- |
| `native`      | `amountNative`| `AmountBase`    | Paid in the chain's gas asset (ETH for EVM, SOL for Solana, …).        |
| `source`      | `amountSource`| `AmountBase`    | Deducted from the user's input balance, in the source asset's base unit. |
| `destination` | `amountDest`  | `AmountBase`    | Subtracted from the output, in the destination asset's base unit.      |
| `protocol`    | `amount`+`asset` | `AmountBase`+`AssetRef` | Provider fee denominated in `asset`.                            |
| `usd`         | `amountUsdMicros` | `AmountUsdMicros` | Provider's USD-equivalent hint. **Informational only.** Never used for execution. |

`Route.feesAggregated` is the union of all `RouteLeg.fees`. It may
include extra `usd` entries surfaced by the provider that don't appear
on any individual leg. Atlas does not require strict additivity
between per-leg fees and `feesAggregated`; if a provider charges a
flat route-level fee, it appears only in `feesAggregated`.

---

## Approvals

`Approval` represents a setup transaction the caller must broadcast
before the route's main leg transactions.

```
Approval
  kind:        ApprovalKind   // 'erc20_approve' | 'spl_ata_create' | 'ton_jetton_init' | 'trc20_approve' | 'noop'
  asset:       AssetRef
  spender:     AddressString
  amount:      AmountBase     // exact, never infinite
  transaction: UnsignedTransaction
  rationale:   string         // short, human-readable
```

Rules:

- `amount` is always the **exact** amount required for the route.
  Atlas never returns an infinite approval. If a caller wants
  infinite approval, they construct it themselves outside of Atlas.
- `kind` is `'noop'` when surfaced for shape-symmetry only (e.g. an
  EVM swap of a token that does not require approval). A `'noop'`
  approval must not be broadcast.

---

## UnsignedTransaction

Discriminated union over `TransactionKind` (`evm`, `solana`, `ton`,
`tron`, `transfer`). Each variant uses only:

- `bigint` for amounts,
- `Uint8Array` for opaque bytes,
- branded `AddressString` for addresses,
- branded `ChainRef` for chains.

No third-party types leak into the public surface. No `Buffer`.
Adapters that call WDK wallet methods convert these structures into
the wallet's per-chain transaction shape internally.

---

## Status taxonomy

Closed string union (`AtlasStatus`). Permitted transitions:

```
preparing
   ├→ awaiting_approval
   │     ├→ awaiting_signature
   │     │     ├→ broadcast
   │     │     │     └→ confirming
   │     │     │           ├→ bridging
   │     │     │           │     └→ settling
   │     │     │           │           ├→ succeeded         (terminal)
   │     │     │           │           └→ partially_completed (terminal)
   │     │     │           └→ settling
   │     │     │                 ├→ succeeded         (terminal)
   │     │     │                 └→ failed            (terminal)
   │     │     ├→ cancelled (terminal)
   │     │     └→ expired   (terminal)
   │     ├→ cancelled (terminal)
   │     └→ expired   (terminal)
   ├→ cancelled (terminal)
   ├→ expired   (terminal)
   └→ failed    (terminal, if the adapter fails before any broadcast)

broadcast | confirming | bridging | settling → failed (terminal)
                                              → partially_completed (terminal)
```

A status only goes forwards along this graph. If a status appears to
regress (e.g. the provider reports `confirming` after Atlas previously
surfaced `bridging`), the LATER status is authoritative — adapters
update `updatedAtUnixSec` and present the new state. Adapters MUST NOT
re-broadcast or re-prepare on regression: the previously-broadcast
transactions are still on-chain.

Terminal states: `succeeded`, `partially_completed`, `failed`,
`expired`, `cancelled`. Callers stop polling on any of these.

---

## Errors

`AtlasError` is the base of every typed error. Two axes:

- `code: AtlasErrorCode` — closed string union: *what happened*.
- `severity: AtlasErrorSeverity` — closed string union: *how to react*.

| `severity`        | Meaning                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `retryable`       | Transient. Same call may succeed again after a backoff.                            |
| `investigate`     | Caller input or environment needs attention. No retry without changes.             |
| `funds_at_risk`   | An on-chain action is in flight or stuck. Do not retry blindly. Show to user.       |
| `provider_broken` | Upstream provider violated its contract. Switch providers or escalate.             |

Callers branch on `severity` first, then on `code` for display. There
is no `retryable: boolean` shortcut — the four-value axis is the
contract.

`AtlasError.context` is optional and exists for display only. The
`providerMessage` field is the verbatim message from the upstream
provider; adapters MUST redact secrets before storing it.

`Error.cause` is preserved through the `cause` constructor option so
callers can walk the stack with `e.cause`.

---

## Configuration

```
AtlasProtocolConfig
  chains?:              Readonly<Record<ChainRef, ChainConfig>>
  provider?:            ProviderConfig
  logger?:              AtlasLogger
  now?:                 () => UnixSec
  defaultQuoteTtlSec?:  DurationSec
```

`chains` is keyed by CAIP-2 `ChainRef`, mirroring the bridge
reference's `BLOCKCHAINS[targetChain]` lookup pattern. Adapters read
it as `config.chains?.[chainRef]`. If omitted, the adapter uses its
built-in registry.

Both `logger` and `now` are dependency-injected for testability.
Defaults: `logger` is a no-op; `now` is
`() => Math.floor(Date.now() / 1000)`. The recommended
`defaultQuoteTtlSec` when a provider does not declare a TTL is 30
seconds.

`ChainConfig` carries display-name, native-asset-decimals, native-asset
sentinel address, and average block time. Adapters extend it with
their own per-chain fields.

`ProviderConfig` carries provider id, display name, optional REST
endpoint, optional per-request timeout. Adapters extend it with
credentials and provider-specific knobs.

---

## State ownership

Atlas Core owns:

- the data model;
- exact approval amounts (never infinite);
- end-to-end fee caps and slippage floors;
- the status taxonomy and its transitions.

The WDK wallet account owns:

- private keys and signing;
- nonces;
- gas-price / fee-bump strategy;
- broadcasting transactions.

The provider (REST adapter or SDK adapter) owns:

- pricing and route construction;
- the binding from `Quote` to `RoutePreparation`
  via `ProviderRouteId`;
- in-flight status, including detection of `partially_completed`.

Atlas Core never holds funds, never signs, never broadcasts. Adapters
return structured intent; the caller's WDK wallet does the rest.

---

## JSON boundary

`bigint` does not survive `JSON.stringify` by default. When Atlas
types cross a JSON boundary (RPC, IPC, storage):

- encode every `bigint` as a **decimal string** (no quotes-of-quotes
  ambiguity, no scientific notation, no `0x` prefix);
- decode it back to `bigint` immediately on the receiving side, before
  any code reads the field.

Atlas Core v1 does not ship a codec for this. SCHEMA.md is the only
authoritative reference — see QUESTIONS.md Q17.

---

## Compatibility & versioning

`ATLAS_PROTOCOL_VERSION` is exported as a semver string and matches
`package.json.version` exactly. Adapters declare in their own README
which `ATLAS_PROTOCOL_VERSION` range they were built against.

Pre-release versions (`0.x.y-alpha.*`, `0.x.y-beta.*`,
`0.x.y-rc.*`) do not follow strict semver — any pre-release may
introduce breaking changes without notice. The current published
version is `0.1.0-alpha.0`; consumers depending on it should pin
exactly, not range-match.

On `0.1.0` GA:

- a breaking change to any public typedef or to `AtlasProtocol`'s
  abstract surface is a **major** version bump;
- additions to closed-set constants (`AtlasStatus`, `AtlasErrorCode`,
  …) are **major** because callers exhaustively switch on them.

---

## For TypeScript adapter authors

Atlas Core follows the WDK convention of marking `AtlasProtocol`'s
`_account` and `_config` members as `@private` (matching
`wdk-protocol-bridge-usdt0-evm/src/usdt0-protocol-evm.js` line 67).
The emitted `types/src/atlas-protocol.d.ts` declares both as
`private`. At JavaScript runtime this has no effect — subclasses
read these fields freely, and the existing tests rely on that.

In **TypeScript**, however, the strict access modifier is enforced
by `tsc` (`TS2341: Property '_account' is private and only
accessible within class 'AtlasProtocol'`). Adapter authors writing
TypeScript who need to read these inherited fields have two
established options:

1. **Cast at the access site** (preferred, scoped):
   ```ts
   const account = (this as unknown as { _account: AtlasWalletAccountLike })._account
   ```

2. **Re-declare a `protected` shadow in the adapter** (works because
   JS classes share one storage slot regardless of the JSDoc tag):
   ```ts
   class RangoProtocol extends AtlasProtocol {
     // @ts-expect-error - WDK convention marks parent member @private; we expose
     protected declare _account: AtlasWalletAccountLike
     // ... use this._account normally throughout the class
   }
   ```

Do **not** change the parent typedef from `@private` to
`@protected`. The convention is load-bearing — see
`CLAUDE.md` § 3.1. JavaScript adapters are unaffected (the JSDoc
tag is non-enforcing at JS runtime).
