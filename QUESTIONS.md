# Atlas Core — Open Design Questions

This file blocks implementation. Every entry must be resolved with the
Tether/WDK reviewer before `src/` files are filled in. Each question lists
the options considered, the financial / scaling risk of getting it wrong,
and the author's current recommendation (R).

The recommendation is a **proposal, not a decision**. Do not treat any
recommendation as adopted until this file is annotated with an explicit
"Resolved: …" line under the relevant section.

---

## Q1. Cross-chain route atomicity

Can a single `Route` contain legs that execute on different chains, and
if so what are the atomicity guarantees?

Options:
1. Single-chain only per Route; cross-chain is modelled as multiple
   sequential routes orchestrated by the caller.
2. Multi-chain Route with **per-leg commit**: each leg is broadcast and
   confirmed before the next leg's transaction is constructed. No
   rollback — partial completion is a terminal state with funds
   parked on an intermediate chain.
3. Multi-chain Route with **whole-route commit**: Atlas signs all
   transactions upfront and broadcasts them in order; still no
   true atomicity, but the caller is presented a single
   "execute(route)" surface.

Risk: option 3 hides partial-completion failure modes from the caller
and can leave user funds stranded on an intermediate chain. Option 1
forces every consumer to re-build orchestration logic Atlas was
supposed to centralise.

R: Option 2. Cross-chain is first-class; atomicity is **never claimed**;
the type system exposes the partial-completion state via
`RouteExecution.status === 'partially_completed'` and a
`recoverableLegs[]` field. The README must say so in bold.

---

## Q2. Quote lifecycle: TTL, revalidation, and provider re-pricing

Does a `Quote` carry a TTL, and who is responsible for revalidating it
before `execute`?

Options:
1. No TTL; quote is a snapshot, the caller assumes all freshness risk.
2. Provider-supplied TTL via `expiresAtUnixSec`; Atlas surfaces it but
   does not enforce it.
3. Provider-supplied TTL; Atlas refuses `execute` after expiry and
   forces a re-quote.
4. Provider-supplied TTL; Atlas auto-revalidates via the provider on
   expiry and surfaces a `priceMovedBps` delta to the caller.

Risk: option 1 is a money-loss bug factory. Option 4 introduces hidden
RPC traffic and a re-pricing step the caller did not authorise — the
new price could be worse than the original `minAmountOut`.

R: Option 3. `Quote.expiresAtUnixSec` is mandatory; `execute()` throws
`AtlasQuoteExpiredError` (code `QUOTE_EXPIRED`, retry-safe) past expiry.
Re-quoting is an explicit caller action.

---

## Q3. Slippage: per-leg vs end-to-end

When a route has multiple legs, is slippage a single end-to-end limit
or a per-leg limit?

Options:
1. End-to-end only: caller specifies `slippageBps`, Atlas derives
   `minAmountOut` at the final leg; intermediate slippage absorbed
   by the route.
2. Per-leg only: every `RouteLeg` carries `minAmountOut`; the caller
   tunes each one (expert mode).
3. Both: top-level `slippageBps` is the user-facing knob; per-leg
   `minAmountOut` is exposed read-only for inspection.

Risk: option 1 hides intermediate dust loss; option 2 is unusable by
non-expert callers; option 3 doubles the surface but keeps each
representation honest.

R: Option 3. Top-level `PreferencesInput.slippageBps` is the input;
each `RouteLeg.minAmountOut: bigint` is computed by the provider and
exposed read-only for audit. End-to-end `Route.minAmountOut: bigint`
equals the final leg's `minAmountOut`.

---

## Q4. State ownership: nonces, approvals, gas

Does Atlas own approval, nonce, and gas-price state, or does it
delegate entirely to the WDK wallet account?

Options:
1. Atlas delegates everything to `WalletAccount.*` and exposes only
   "give me the transactions to sign" (route preparation), letting
   the WDK account handle nonce/gas. (This is what the bridge
   reference does for ERC-4337.)
2. Atlas owns approval state (knows current allowance vs required),
   delegates nonce/gas to the wallet.
3. Atlas owns everything; wallet is a signer only.

Risk: option 3 duplicates state that WDK already manages and creates
a second source of truth for nonces — a known way to lose funds via
replay or stuck transactions.

R: Option 2. Approvals are returned as part of the route preparation
(`RoutePreparation.approvals[]`) with **exact amounts**, never
infinite. Nonce and gas remain with the WDK wallet account. Atlas
never broadcasts approvals on the caller's behalf — it returns them
and lets the caller's `WalletAccount.approve` execute them, mirroring
how `Usdt0ProtocolEvm.bridge()` requires upfront approval.

---

## Q5. Fee denomination

In what units are fees quoted?

Options:
1. Source-asset units only (caller does conversion if they care).
2. Native gas unit only (wei / lamports / TRX / nanoTON).
3. Normalised micro-USD only (`amountUsdMicros: bigint`).
4. All three populated by the provider where available, exposed as a
   discriminated union (`{ kind: 'native', amountNative: bigint } |
   { kind: 'source', amountSource: bigint } | { kind: 'usd',
   amountUsdMicros: bigint }`).

Risk: option 3 imposes a USD price oracle dependency Atlas should not
own. Option 1 forces a USD comparison engine into the caller's code.

R: Option 4 as a `Fee` discriminated union, with an additional
`Fee.kind: 'native' | 'source' | 'destination' | 'usd' | 'protocol'`
where `usd` is an *informational hint* the provider may attach but is
**never load-bearing for execution**. Comparison between fees of
different kinds is the caller's responsibility (documented in
SCHEMA.md).

---

## Q6. Chain identity: how do we name chains?

WDK chain enums are still evolving. What's the canonical chain
identifier in Atlas types?

Options:
1. Numeric chain ID only (EVM-centric, breaks for non-EVM).
2. WDK chain enum string (`'ethereum'`, `'solana'`, …) — but the enum
   may not include every chain Atlas wants to route to.
3. Branded `ChainId` opaque string + a separate `chainNamespace` field
   (`'eip155' | 'solana' | 'tron' | 'ton' | 'cosmos' | 'bitcoin'`)
   following CAIP-2 (e.g. `eip155:1`, `solana:5eykt4Use...`).

Risk: option 1 silently corrupts non-EVM routes. Option 2 needs WDK
core changes Atlas is forbidden from making.

R: Option 3 — CAIP-2-style `ChainRef` branded string, with a
`KnownChain` const-object listing the chains Atlas ships out of the
box. Unknown chains are *not* rejected at the type level; they're
rejected at the provider layer with `AtlasChainUnsupportedError`.

---

## Q7. Route commitment model

Is a `RoutePreparation` (the transactions to sign) reusable, or does
it pin to a one-shot `requestId` issued by the provider?

Options:
1. Stateless: caller can sign and broadcast the prepared transactions
   any time, no provider handshake.
2. Provider-bound: `RoutePreparation` carries an opaque
   `providerRouteId: string` that must be sent back to the provider
   on `trackStatus`. If the provider expires the id, status returns
   `unknown`.
3. Caller-chosen: caller provides their own correlation id; Atlas
   surfaces it as `correlationId` and providers use it where they can.

Risk: option 1 breaks for providers that price-lock via server-side
state (most REST aggregators including Rango). Option 3 doesn't
survive provider restarts.

R: Option 2 as the primary, with optional caller `correlationId` for
observability. `RoutePreparation.providerRouteId: ProviderRouteId`
(branded string) is required; `RouteExecution.providerRouteId` is
the same value.

---

## Q8. Provider selection: who chooses?

When multiple providers can route the same trade, who picks?

Options:
1. Atlas picks (best route by `Preferences.optimiseFor`).
2. Caller picks by passing `Preferences.providers: ProviderId[]`
   allowlist or `Preferences.excludeProviders: ProviderId[]`.
3. Both — top-of-list is Atlas's recommendation, but the response
   carries `alternatives[]` for the caller to override.

Risk: option 1 breaks audit / compliance scenarios where the caller
must avoid a sanctioned provider. Option 2 forces every caller to know
the universe of providers.

R: Option 3. `quote()` returns `Quote` plus `Quote.alternatives:
readonly Quote[]`. Caller can pass `Preferences.providers` /
`Preferences.excludeProviders` to constrain the universe before Atlas
ranks. The current `Quote` is always the recommendation.

---

## Q9. Status taxonomy — what's the closed set?

Options for `RouteStatus`:

1. `'pending' | 'running' | 'succeeded' | 'failed'` (Rango-style,
   minimal).
2. `'preparing' | 'awaiting_approval' | 'awaiting_signature' |
   'broadcast' | 'confirming' | 'bridging' | 'settling' |
   'succeeded' | 'partially_completed' | 'failed' | 'expired' |
   'cancelled'` (full lifecycle).
3. Two-level: a coarse `state` (`pending` / `active` / `terminal`)
   plus a fine `stage` string for display.

Risk: option 1 loses the cross-chain "stuck on intermediate chain"
state — exactly the case where a user has lost visibility on their
funds. Option 2 is verbose but exhaustive.

R: Option 2 as a single closed string-union typedef, with
`partially_completed` and `expired` as first-class terminal states.
SCHEMA.md will document each transition.

---

## Q10. Error retry semantics

Should every error carry a `retryable` boolean, or do we model retry
class as part of the error taxonomy?

Options:
1. Boolean `retryable` on every error.
2. Discriminated taxonomy with a `severity` axis:
   `'retryable' | 'investigate' | 'funds_at_risk' | 'provider_broken'`.
3. Both — `severity` enum plus a `retryable` boolean derived from it
   for ergonomics.

Risk: option 1 collapses "retry now" vs "retry after provider
recovers" vs "do not retry, funds may be moving" into a single bit.

R: Option 2. `AtlasError.severity: AtlasErrorSeverity` is the
authoritative axis; callers branch on it. No boolean shortcut — the
ergonomics gain isn't worth the temptation to ignore the other
states.

---

## Q11. Approval style: ERC-20 only, or generalised?

Many target chains don't have ERC-20 approvals (Solana SPL needs an
ATA, TON needs a jetton wallet, Tron has TRC-20 approvals but
different semantics). What's the shape of `Approval`?

Options:
1. EVM-only `Approval` type; non-EVM chains return empty `approvals[]`
   and embed any required setup inside `RouteLeg.transactions[]`.
2. Generic `Approval` with a discriminated union over chain
   namespace: `EvmErc20Approval | SolanaAtaCreation | TonJettonInit |
   TronTrc20Approval`.
3. Generic `Approval` as an opaque `{ kind: string; transaction:
   UnsignedTransaction }` — caller treats it as a pre-step
   transaction.

Risk: option 1 hides the SPL/TON setup transactions inside the leg
and the caller can't show "this is a one-time setup" UX. Option 2
explodes the type surface for v1.

R: Option 3 for v1. `Approval` is a typed pre-step with a
discriminator `kind: ApprovalKind` and a `transaction:
UnsignedTransaction`. We add specialised approval shapes in a minor
version only when a real consumer needs them.

---

## Q12. Transaction representation

How does Atlas represent unsigned transactions across chains?

Options:
1. Re-use WDK's per-chain transaction types directly (forces a
   dependency on every WDK wallet package).
2. Opaque `UnsignedTransaction = { chain: ChainRef; namespace:
   ChainNamespace; payload: Uint8Array }` — caller decodes per chain.
3. Tagged union: `UnsignedTransaction = EvmUnsignedTx | SolanaUnsignedTx
   | TonUnsignedTx | TronUnsignedTx | TransferUnsignedTx`.

Risk: option 1 violates the "zero runtime deps in core" rule. Option
2 makes the type useless in IDEs.

R: Option 3 with each variant defined as a JSDoc typedef using only
`Uint8Array` / branded address strings / `bigint` — no third-party
types. Each variant matches the shape WDK wallets already accept.

---

## Q13. Test framework

The grant draft says brittle. The reference module uses Jest. The
prompt allows either with a preference for brittle. Confirm?

Options:
1. brittle only.
2. Jest only (matches reference).
3. Both (publish brittle, accept community Jest PRs).

R: Option 1 (brittle), per the grant draft. The abstract test
scaffolds in this design use brittle's `test` / `is` / `exception`
API. Confirm with reviewer.

---

## Q14. Deadline vs expiry

Distinguish `Quote.expiresAtUnixSec` (price freshness) from
`PreferencesInput.deadlineUnixSec` (caller-supplied "must complete
on-chain by"). Are they both needed?

Options:
1. Only `expiresAtUnixSec`.
2. Only `deadlineUnixSec`.
3. Both, with documented semantics.

R: Option 3. `expiresAtUnixSec` is set by the provider (price
freshness). `deadlineUnixSec` is set by the caller and passed to
providers that support it (e.g. Uniswap V2/V3 `deadline` param).
Atlas refuses to prepare a route whose `expiresAtUnixSec` is past the
caller's `deadlineUnixSec`.

---

## Q15. Read-only vs signing accounts

The bridge reference splits read-only and signing wallet accounts at
construction. Atlas inherits this. Does `quote()` require a signing
account?

Options:
1. `quote()` accepts read-only; `prepare()` and `execute()` require
   signing.
2. All methods require a signing account.

R: Option 1, matching the bridge reference's split. `quote()` and
`getStatus()` accept read-only; `prepare()` and `execute()` require
the signing variant; the abstract class throws
`AtlasReadOnlyAccountError` if a signing operation is called on a
read-only construction.

---

## Q16. Logger / clock injection

Library mindset says no `Date.now()` or `console.log` inside testable
logic. Do we inject these via the constructor config?

Options:
1. Inject via `AtlasProtocolConfig.now?: () => UnixSec` and
   `AtlasProtocolConfig.logger?: AtlasLogger`.
2. Use `globalThis.Date.now()` and emit no logs.

R: Option 1. Both are optional; defaults are `Date.now` and a
no-op logger. Documented in SCHEMA.md so consumers know they can
override for tests.

---

## Q17. JSON serialisation of bigint

`bigint` does not survive `JSON.stringify` by default. Does Atlas
ship a JSON codec, or punt to the caller?

Options:
1. Punt entirely — callers handle JSON.
2. Ship `toAtlasJson(value) / fromAtlasJson(text)` helpers that
   wrap bigints as `{ $bigint: string }` tags.
3. Provide schema docs only; callers pick their own codec.

R: Option 3 for v1 (KISS — zero runtime code). SCHEMA.md documents
the wire-format expectation: bigint → decimal string at JSON
boundary, decoded back to bigint on read. Helpers added in a minor
version only if multiple consumers request them.

---

## Q18. Per-route or per-protocol price caps

The bridge reference has `bridgeMaxFee`. Atlas analogue: per-route
`maxFeeNative: bigint`? Per-leg? Both?

Options:
1. Per-route only.
2. Per-leg only.
3. Both with per-route as the dominant cap.

R: Option 1 for v1. `PreferencesInput.maxFeeNative?: bigint` is an
end-to-end cap denominated in the *source chain's* native gas asset.
`execute()` throws `AtlasFeeCapExceededError` before broadcasting.
Per-leg caps are deferred; introduce only on user request.

---

## Q19. What does Atlas Core actually ship as v1?

The grant draft scopes M1 as "design only". This file is M1's
deliverable. Confirm that Atlas Core v1 *does not* include any
aggregator adapter — the Rango adapter is a separate package that
will depend on `@unifyverse-exchange/atlas-core`.

R: Confirmed by the prompt. This package exports only types,
constants, errors, and the abstract `AtlasProtocol` class. Adapters
live in sibling packages and extend `AtlasProtocol`.

---

## Q20. Package name

The grant draft uses "CoffeeRoute". The prompt uses "Atlas Core".
The working directory is `first-module-impl/`. Which name ships?

R: Recommend `@unifyverse-exchange/atlas-core` (npm-publishable scoped name)
until Tether allocates a `@tetherto/*` scope. Defer scope decision to
reviewer. `package.json.name` below uses `@unifyverse-exchange/atlas-core` as a
placeholder.
