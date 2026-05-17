// Copyright 2026 UnifyVerse B.V.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

/* eslint-disable no-unused-vars */
//
// This module is JSDoc-typedef-only. It exports nothing at runtime.
// All identifiers below are surfaced as TypeScript types via `tsc`.
//

/** @typedef {import('./constants.js').AtlasStatusValue} AtlasStatusValue */
/** @typedef {import('./constants.js').ChainNamespaceValue} ChainNamespaceValue */
/** @typedef {import('./constants.js').ApprovalKindValue} ApprovalKindValue */
/** @typedef {import('./constants.js').FeeKindValue} FeeKindValue */
/** @typedef {import('./constants.js').TransactionKindValue} TransactionKindValue */
/** @typedef {import('./constants.js').OptimisationValue} OptimisationValue */

// ----------------------------------------------------------------------------
// Branded primitive aliases.
//
// These do not change runtime behaviour. They prevent silent mixing of
// semantically distinct strings/numbers at the type level.
// ----------------------------------------------------------------------------

/**
 * CAIP-2-style chain reference, e.g. `"eip155:1"`, `"solana:5eykt4Use..."`,
 * `"tron:0x2b6653dc"`, `"ton:-239"`. Always lowercased in canonical form.
 *
 * @typedef {string & { readonly __brand: 'ChainRef' }} ChainRef
 */

/**
 * Stable identifier for a routing provider, e.g. `"rango"`, `"layerzero"`,
 * `"jupiter"`. Lowercase ASCII, kebab-case allowed.
 *
 * @typedef {string & { readonly __brand: 'ProviderId' }} ProviderId
 */

/**
 * Opaque identifier issued by a provider to bind a quote to its later
 * execution. Treat as a server-side handle: do not parse or mutate.
 *
 * @typedef {string & { readonly __brand: 'ProviderRouteId' }} ProviderRouteId
 */

/**
 * Caller-supplied correlation id surfaced through logs and provider
 * telemetry. Atlas never inspects this value.
 *
 * @typedef {string & { readonly __brand: 'CorrelationId' }} CorrelationId
 */

/**
 * Canonical wallet or contract address as a string. Each chain namespace
 * defines its own canonical form (EVM: lowercased 0x-prefixed hex; Solana:
 * base58; TON: user-friendly base64url; Tron: base58check; Cosmos: bech32).
 * Mixing addresses across namespaces is a programmer error.
 *
 * @typedef {string & { readonly __brand: 'AddressString' }} AddressString
 */

/**
 * Canonical transaction hash string. EVM: 0x-prefixed lowercase hex.
 * Solana: base58. TON: base64url. Tron: hex. The shape is opaque to
 * Atlas; this brand exists to stop accidental concatenation with
 * addresses.
 *
 * @typedef {string & { readonly __brand: 'TxHashString' }} TxHashString
 */

/**
 * Reference to a specific on-chain asset.
 *
 * @typedef {object} AssetRef
 * @property {ChainRef} chain - The chain the asset lives on.
 * @property {AddressString | null} address - Token contract address, or `null` for the chain's native asset. Token-standard agnostic (does not distinguish ERC-20 / ERC-721 / SPL / TRC-20 / TON jetton). Standard validation is the adapter's responsibility.
 * @property {number} decimals - Number of decimal places used to convert between base units and human display. Must be a non-negative integer. Typical range [0, 18] for EVM, [0, 9] for Solana/TON. No hard upper bound — some tokens use 26+.
 * @property {string} symbol - Display symbol (e.g. `"USDT"`). Informational; never used for matching.
 */

/**
 * Minimal duck-typed shape every Atlas adapter expects of the WDK wallet
 * account it receives at construction. This is intentionally narrower than
 * any concrete WDK class so Atlas Core stays dependency-free. Concrete
 * adapters narrow this to the specific `WalletAccount*` variant they need.
 *
 * @typedef {object} AtlasWalletAccountLike
 * @property {() => Promise<AddressString>} getAddress - Returns the account's primary address on its native chain.
 * @property {{ [key: string]: unknown }} _config - Opaque wallet config bag. WDK wallet accounts expose this; adapters narrow it to the specific shape they need (e.g. `{ provider: string | object }` for EVM).
 */

/**
 * Seconds since the Unix epoch. Always integer.
 *
 * @typedef {number & { readonly __brand: 'UnixSec' }} UnixSec
 */

/**
 * Non-negative duration in seconds. Always integer.
 *
 * @typedef {number & { readonly __brand: 'DurationSec' }} DurationSec
 */

/**
 * Amount denominated in an asset's base unit (no decimals applied).
 * For ERC-20 USDT this is "6-decimal units"; for ETH it is wei.
 * Always non-negative. Always `bigint`.
 *
 * Brand is type-level only; no runtime enforcement. Adapters validating
 * external input MUST check `typeof x === 'bigint' && x >= 0n` before
 * casting.
 *
 * @typedef {bigint & { readonly __brand: 'AmountBase' }} AmountBase
 */

/**
 * Accepted input shape for amounts at the public API boundary. The bridge
 * reference module accepts `number | bigint` and coerces with `BigInt(x)`
 * internally (see wdk-protocol-bridge-usdt0-evm/src/usdt0-protocol-evm.js
 * line 100). Atlas follows the same convention: callers may pass either,
 * adapters coerce to `AmountBase` (`bigint`) before any computation. Never
 * pass a `number` exceeding `Number.MAX_SAFE_INTEGER` (2^53 - 1); use
 * `bigint` for any amount that may exceed this.
 *
 * @typedef {number | bigint} AmountInput
 */

/**
 * Amount denominated in micro-USD (1e6 micro-USD = 1 USD). Used only as a
 * provider-supplied informational hint; **never load-bearing for
 * execution**. Always `bigint`.
 *
 * Brand is type-level only. For display, slice the decimal-string form
 * (`x.toString().padStart(7, '0')` -> insert `.` at position -6). Never
 * divide by 1e6 in float arithmetic.
 *
 * @typedef {bigint & { readonly __brand: 'AmountUsdMicros' }} AmountUsdMicros
 */

/**
 * Integer basis points. 1 bp = 0.01 %. Always non-negative.
 * 10_000 bp = 100 %.
 *
 * @typedef {number & { readonly __brand: 'BasisPoints' }} BasisPoints
 */

// ----------------------------------------------------------------------------
// Fees and approvals.
// ----------------------------------------------------------------------------

/**
 * A single fee component attached to a route or leg. Discriminated by
 * `kind`; consumers branch on `kind` before reading the amount field.
 *
 * - `'native'`: paid in the source chain's gas asset (e.g. ETH for EVM).
 *   `amountNative: AmountBase`. Used for gas estimates and LayerZero-style
 *   bridge fees.
 * - `'source'`: paid out of the user's input asset balance.
 *   `amountSource: AmountBase`.
 * - `'destination'`: subtracted from the output on the destination chain.
 *   `amountDest: AmountBase`.
 * - `'protocol'`: fee charged by the provider, denominated in `asset`.
 *   `amount: AmountBase`, `asset: AssetRef`.
 * - `'usd'`: informational USD value of any of the above, **never** used
 *   for execution decisions. `amountUsdMicros: AmountUsdMicros`.
 *
 * @typedef {(
 *   | { kind: 'native', label: string, amountNative: AmountBase }
 *   | { kind: 'source', label: string, amountSource: AmountBase }
 *   | { kind: 'destination', label: string, amountDest: AmountBase }
 *   | { kind: 'protocol', label: string, asset: AssetRef, amount: AmountBase }
 *   | { kind: 'usd', label: string, amountUsdMicros: AmountUsdMicros }
 * )} Fee
 */

/**
 * A pre-execution setup transaction the caller must broadcast before the
 * route's main leg transactions.
 *
 * `kind` discriminates the semantic (`'erc20_approve'`,
 * `'spl_ata_create'`, `'ton_jetton_init'`, `'trc20_approve'`, `'noop'`).
 * The transaction itself is opaque — the caller signs and broadcasts it
 * via the WDK wallet account.
 *
 * Approval amounts are always **exact**; infinite approvals are not
 * represented in this type.
 *
 * @typedef {object} Approval
 * @property {ApprovalKindValue} kind - Discriminator over approval semantics. If `kind === 'noop'`, the approval MUST NOT be broadcast — skip it entirely.
 * @property {AssetRef} asset - The asset being approved or set up.
 * @property {AddressString} spender - The contract address that will be allowed to move the asset.
 * @property {AmountBase} amount - Exact approval amount, in the asset's base units. Never infinite.
 * @property {UnsignedTransaction} transaction - The transaction the caller must sign and broadcast. Discriminate on `transaction.kind` before reading variant-specific fields.
 * @property {string} rationale - Short human-readable reason ("approve OFT contract for cross-chain transfer").
 */

// ----------------------------------------------------------------------------
// Unsigned transactions (chain-namespaced).
//
// These mirror the shapes WDK wallet accounts already accept. They use
// only `bigint`, `Uint8Array`, and branded strings; no third-party types
// leak into the public surface.
// ----------------------------------------------------------------------------

/**
 * Unsigned EVM transaction body (1559- or legacy-compatible). Atlas
 * never sets gas fields; the wallet account is responsible for gas.
 *
 * @typedef {object} EvmUnsignedTx
 * @property {'evm'} kind
 * @property {ChainRef} chain
 * @property {AddressString} to
 * @property {bigint} value - Native asset value in wei.
 * @property {Uint8Array} data - Calldata. Empty `Uint8Array` for pure transfers.
 */

/**
 * Unsigned Solana transaction as a serialised legacy or v0 message.
 *
 * @typedef {object} SolanaUnsignedTx
 * @property {'solana'} kind
 * @property {ChainRef} chain
 * @property {Uint8Array} message - Serialised compiled message; the wallet account adds signatures.
 * @property {readonly AddressString[]} requiredSigners - Accounts that must sign, in the order Solana expects.
 */

/**
 * Unsigned TON internal message body.
 *
 * @typedef {object} TonUnsignedTx
 * @property {'ton'} kind
 * @property {ChainRef} chain
 * @property {AddressString} to
 * @property {bigint} value - Value in nanoTON.
 * @property {Uint8Array} body - BoC-encoded message body.
 * @property {number} sendMode - TON send-mode flags.
 */

/**
 * Unsigned Tron TRC-20 / TRC-10 transaction encoded as a raw_data hex
 * payload. The wallet account converts the hex to bytes before signing.
 *
 * @typedef {object} TronUnsignedTx
 * @property {'tron'} kind
 * @property {ChainRef} chain
 * @property {string} rawDataHex - 0x-prefixed hex of the unsigned raw_data.
 */

/**
 * A plain native-asset transfer abstracted from chain specifics. Used by
 * providers that hand back "just send X to Y" instructions on Bitcoin-like
 * chains where Atlas has no richer transaction model.
 *
 * @typedef {object} TransferUnsignedTx
 * @property {'transfer'} kind
 * @property {ChainRef} chain
 * @property {AddressString} to
 * @property {AmountBase} amount
 * @property {Uint8Array} [memo] - Optional memo bytes (e.g. for chains with memo fields).
 */

/**
 * Tagged union of every unsigned transaction shape Atlas understands.
 * Always discriminate on `kind` before reading variant fields.
 *
 * @typedef {EvmUnsignedTx | SolanaUnsignedTx | TonUnsignedTx | TronUnsignedTx | TransferUnsignedTx} UnsignedTransaction
 */

// ----------------------------------------------------------------------------
// Quote, route, leg.
// ----------------------------------------------------------------------------

/**
 * Caller's routing preferences. All fields are optional; defaults are
 * provider-dependent but Atlas documents the expected defaults in
 * SCHEMA.md.
 *
 * @typedef {object} PreferencesInput
 * @property {OptimisationValue} [optimiseFor] - What to optimise the route for.
 * @property {BasisPoints} [slippageBps] - End-to-end slippage tolerance in basis points (e.g. `50` for 0.50 %). Range [0, 10_000]. Adapters MUST reject out-of-range values with `AtlasInvalidInputError`.
 * @property {UnixSec} [deadlineUnixSec] - Caller-supplied deadline; route must complete by this time. Distinct from `Quote.expiresAtUnixSec` which is provider-supplied price freshness.
 * @property {AmountBase} [maxFeeNative] - End-to-end cap on the SUM of all `Fee` entries with `kind === 'native'`, denominated in the *source chain's* native gas asset. Adapters MUST raise `AtlasFeeCapExceededError` BEFORE broadcasting any transaction.
 * @property {readonly ProviderId[]} [providers] - Allowlist; if set, only these providers may be considered.
 * @property {readonly ProviderId[]} [excludeProviders] - Denylist; takes precedence over `providers`.
 * @property {readonly ChainRef[]} [allowedIntermediateChains] - Constrain which chains a multi-leg route may pass through.
 * @property {number} [maxLegs] - Hard limit on the number of legs in the route. Must be >= 1 if provided. Provider chooses a default otherwise.
 * @property {CorrelationId} [correlationId] - Caller-defined id surfaced through logs and provider telemetry.
 */

/**
 * Input to `quote()`. All amounts are in the base unit of the source
 * asset.
 *
 * @typedef {object} QuoteInput
 * @property {AssetRef} fromAsset - Source asset.
 * @property {AssetRef} toAsset - Destination asset.
 * @property {AmountInput} amountSource - Exact input amount, in `fromAsset` base units. Accepts `number | bigint`; adapters coerce to `AmountBase` via `BigInt(x)` internally. Use `bigint` for any value that may exceed `Number.MAX_SAFE_INTEGER`.
 * @property {AddressString} fromAddress - Sender address on the source chain.
 * @property {AddressString} toAddress - Recipient address on the destination chain. May equal `fromAddress` for same-recipient routes.
 * @property {PreferencesInput} [preferences] - Optional routing preferences.
 */

/**
 * A single leg of a route. Atomically executable on its own chain; a
 * multi-leg route is a sequence of legs in execution order.
 *
 * Adjacent legs must chain: `legs[i].toAsset === legs[i+1].fromAsset`
 * (same chain AND address). Adapter responsibility.
 *
 * @typedef {object} RouteLeg
 * @property {number} index - 0-based position within the parent route.
 * @property {ProviderId} provider - The provider responsible for this leg.
 * @property {ChainRef} chain - The chain the leg executes on.
 * @property {AssetRef} fromAsset - Input asset of this leg.
 * @property {AssetRef} toAsset - Output asset of this leg.
 * @property {AmountBase} amountIn - Expected input to this leg, in `fromAsset` base units.
 * @property {AmountBase} amountOutExpected - Expected output, in `toAsset` base units. Indicative; not a guarantee.
 * @property {AmountBase} minAmountOut - Read-only per-leg floor derived from the route's end-to-end slippage; if actual output dips below this, the leg fails. Must satisfy `minAmountOut <= amountOutExpected`. See SCHEMA.md §Route and RouteLeg invariants.
 * @property {readonly Fee[]} fees - All fees attributed to this leg.
 * @property {DurationSec} expectedDurationSec - Provider's expected leg duration (e.g. bridge settlement time).
 * @property {readonly Approval[]} approvals - Setup transactions required before this leg's `transactions[]`.
 * @property {readonly UnsignedTransaction[]} transactions - Ordered transactions to broadcast for this leg. Each must be signed and broadcast by the caller in order.
 * @property {string} [providerLegRef] - Opaque provider-supplied per-leg reference for status tracking.
 */

/**
 * A complete route from `fromAsset` to `toAsset`, potentially spanning
 * multiple chains. Atomicity across legs is **never** claimed; cross-chain
 * routes can terminate in `partially_completed` with funds parked on an
 * intermediate chain.
 *
 * @typedef {object} Route
 * @property {ProviderRouteId} providerRouteId - Provider-issued handle binding this route to its later execution.
 * @property {ProviderId} provider - The provider that produced this route.
 * @property {AssetRef} fromAsset
 * @property {AssetRef} toAsset
 * @property {AmountBase} amountSource - Exact input amount, as supplied in `QuoteInput`.
 * @property {AmountBase} amountDestExpected - Expected end-to-end output, in `toAsset` base units.
 * @property {AmountBase} minAmountOut - End-to-end output floor, equal to the final leg's `minAmountOut`.
 * @property {BasisPoints} slippageBps - The end-to-end slippage tolerance applied when computing `minAmountOut`.
 * @property {readonly RouteLeg[]} legs - Ordered legs. Length >= 1. See SCHEMA.md for the full invariant list.
 * @property {readonly Fee[]} feesAggregated - All fees from all legs, surfaced for at-a-glance review. Sum equality is *not* required between this list and the per-leg lists if a provider charges out-of-band fees; see SCHEMA.md.
 * @property {DurationSec} expectedDurationSec - Sum of per-leg expected durations.
 * @property {readonly { providerId: ProviderId, reason: string }[]} alternativesConsidered - Brief audit trail of other providers Atlas considered and why they were not chosen.
 */

/**
 * A priced route ready for caller review. A `Quote` is a `Route` plus
 * freshness metadata and a (possibly empty) ranked list of alternative
 * routes. `Quote.route` is always Atlas's recommended choice given the
 * caller's `PreferencesInput.optimiseFor`.
 *
 * @typedef {object} Quote
 * @property {Route} route - Recommended route.
 * @property {readonly Route[]} alternatives - Other viable routes, ranked. May be empty.
 * @property {UnixSec} quotedAtUnixSec - When the quote was generated.
 * @property {UnixSec} expiresAtUnixSec - Provider-declared expiry; calling `prepare()` after this time throws `AtlasQuoteExpiredError`.
 * @property {OptimisationValue} optimisedFor - The criterion used to choose `route`.
 * @property {CorrelationId} [correlationId] - Echoed back from the caller's `PreferencesInput.correlationId` if supplied.
 */

/**
 * Output of `prepare()`. The caller signs and broadcasts each transaction
 * in `approvals[]` first, then walks each leg in order broadcasting
 * `legs[i].transactions` in sequence.
 *
 * `RoutePreparation` is itself derived from `Quote.route`; the caller
 * should hold both. Re-preparing a route after expiry is the only
 * supported recovery from an expired quote.
 *
 * @typedef {object} RoutePreparation
 * @property {ProviderRouteId} providerRouteId
 * @property {ProviderId} provider
 * @property {Route} route - Echo of the priced route this preparation belongs to.
 * @property {readonly Approval[]} approvals - All approvals from all legs, flattened in execution order. Already included inside each leg, surfaced again for caller convenience.
 * @property {UnixSec} preparedAtUnixSec
 * @property {UnixSec} expiresAtUnixSec - Mirrors `Quote.expiresAtUnixSec`.
 */

/**
 * Per-leg execution record returned by `getStatus()`.
 *
 * @typedef {object} LegExecutionRecord
 * @property {number} legIndex
 * @property {AtlasStatusValue} status - Per-leg status; lifecycle is the same closed set as the route's.
 * @property {readonly TxHashString[]} txHashes - All transactions broadcast for this leg. Broadcast order, earliest first.
 * @property {AmountBase} [amountOutActual] - Set once the leg settles; in `RouteLeg.toAsset` base units.
 * @property {string} [explorerUrl] - Optional URL for caller display.
 * @property {string} [errorMessage] - Free-text from provider if `status === 'failed'`. Not a stable contract.
 */

/**
 * Status snapshot of an in-flight or completed route execution.
 *
 * @typedef {object} RouteExecution
 * @property {ProviderRouteId} providerRouteId
 * @property {ProviderId} provider
 * @property {AtlasStatusValue} status - End-to-end status; see SCHEMA.md for the transition diagram.
 * @property {readonly LegExecutionRecord[]} legs - One record per leg, in route order.
 * @property {AmountBase} [amountDestActual] - Final actual output, in `toAsset` base units; populated once `status === 'succeeded'`.
 * @property {readonly { legIndex: number, chain: ChainRef, asset: AssetRef, amount: AmountBase, recoveryHint: string }[]} [recoverableLegs] - Populated when `status === 'partially_completed'`. Describes funds that ended up on an intermediate chain and how the caller can recover them.
 * @property {UnixSec} updatedAtUnixSec
 */

/**
 * Optional sink for diagnostic messages. Atlas calls these methods at
 * coarse milestones; it never logs secrets, addresses in full, or signed
 * payloads.
 *
 * @typedef {object} AtlasLogger
 * @property {(message: string, context?: Record<string, unknown>) => void} debug
 * @property {(message: string, context?: Record<string, unknown>) => void} info
 * @property {(message: string, context?: Record<string, unknown>) => void} warn
 * @property {(message: string, context?: Record<string, unknown>) => void} error
 */

// No runtime exports. This module exists for `tsc` to materialise typedefs.
export {}
