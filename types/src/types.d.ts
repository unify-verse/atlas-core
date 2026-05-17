export type AtlasStatusValue = import("./constants.js").AtlasStatusValue;
export type ChainNamespaceValue = import("./constants.js").ChainNamespaceValue;
export type ApprovalKindValue = import("./constants.js").ApprovalKindValue;
export type FeeKindValue = import("./constants.js").FeeKindValue;
export type TransactionKindValue = import("./constants.js").TransactionKindValue;
export type OptimisationValue = import("./constants.js").OptimisationValue;
/**
 * CAIP-2-style chain reference, e.g. `"eip155:1"`, `"solana:5eykt4Use..."`,
 * `"tron:0x2b6653dc"`, `"ton:-239"`. Always lowercased in canonical form.
 */
export type ChainRef = string & {
    readonly __brand: "ChainRef";
};
/**
 * Stable identifier for a routing provider, e.g. `"rango"`, `"layerzero"`,
 * `"jupiter"`. Lowercase ASCII, kebab-case allowed.
 */
export type ProviderId = string & {
    readonly __brand: "ProviderId";
};
/**
 * Opaque identifier issued by a provider to bind a quote to its later
 * execution. Treat as a server-side handle: do not parse or mutate.
 */
export type ProviderRouteId = string & {
    readonly __brand: "ProviderRouteId";
};
/**
 * Caller-supplied correlation id surfaced through logs and provider
 * telemetry. Atlas never inspects this value.
 */
export type CorrelationId = string & {
    readonly __brand: "CorrelationId";
};
/**
 * Canonical wallet or contract address as a string. Each chain namespace
 * defines its own canonical form (EVM: lowercased 0x-prefixed hex; Solana:
 * base58; TON: user-friendly base64url; Tron: base58check; Cosmos: bech32).
 * Mixing addresses across namespaces is a programmer error.
 */
export type AddressString = string & {
    readonly __brand: "AddressString";
};
/**
 * Canonical transaction hash string. EVM: 0x-prefixed lowercase hex.
 * Solana: base58. TON: base64url. Tron: hex. The shape is opaque to
 * Atlas; this brand exists to stop accidental concatenation with
 * addresses.
 */
export type TxHashString = string & {
    readonly __brand: "TxHashString";
};
/**
 * Reference to a specific on-chain asset.
 */
export type AssetRef = {
    /**
     * - The chain the asset lives on.
     */
    chain: ChainRef;
    /**
     * - Token contract address, or `null` for the chain's native asset. Token-standard agnostic (does not distinguish ERC-20 / ERC-721 / SPL / TRC-20 / TON jetton). Standard validation is the adapter's responsibility.
     */
    address: AddressString | null;
    /**
     * - Number of decimal places used to convert between base units and human display. Must be a non-negative integer. Typical range [0, 18] for EVM, [0, 9] for Solana/TON. No hard upper bound — some tokens use 26+.
     */
    decimals: number;
    /**
     * - Display symbol (e.g. `"USDT"`). Informational; never used for matching.
     */
    symbol: string;
};
/**
 * Minimal duck-typed shape every Atlas adapter expects of the WDK wallet
 * account it receives at construction. This is intentionally narrower than
 * any concrete WDK class so Atlas Core stays dependency-free. Concrete
 * adapters narrow this to the specific `WalletAccount*` variant they need.
 */
export type AtlasWalletAccountLike = {
    /**
     * - Returns the account's primary address on its native chain.
     */
    getAddress: () => Promise<AddressString>;
    /**
     * - Opaque wallet config bag. WDK wallet accounts expose this; adapters narrow it to the specific shape they need (e.g. `{ provider: string | object }` for EVM).
     */
    _config: {
        [key: string]: unknown;
    };
};
/**
 * Seconds since the Unix epoch. Always integer.
 */
export type UnixSec = number & {
    readonly __brand: "UnixSec";
};
/**
 * Non-negative duration in seconds. Always integer.
 */
export type DurationSec = number & {
    readonly __brand: "DurationSec";
};
/**
 * Amount denominated in an asset's base unit (no decimals applied).
 * For ERC-20 USDT this is "6-decimal units"; for ETH it is wei.
 * Always non-negative. Always `bigint`.
 *
 * Brand is type-level only; no runtime enforcement. Adapters validating
 * external input MUST check `typeof x === 'bigint' && x >= 0n` before
 * casting.
 */
export type AmountBase = bigint & {
    readonly __brand: "AmountBase";
};
/**
 * Accepted input shape for amounts at the public API boundary. The bridge
 * reference module accepts `number | bigint` and coerces with `BigInt(x)`
 * internally (see wdk-protocol-bridge-usdt0-evm/src/usdt0-protocol-evm.js
 * line 100). Atlas follows the same convention: callers may pass either,
 * adapters coerce to `AmountBase` (`bigint`) before any computation. Never
 * pass a `number` exceeding `Number.MAX_SAFE_INTEGER` (2^53 - 1); use
 * `bigint` for any amount that may exceed this.
 */
export type AmountInput = number | bigint;
/**
 * Amount denominated in micro-USD (1e6 micro-USD = 1 USD). Used only as a
 * provider-supplied informational hint; **never load-bearing for
 * execution**. Always `bigint`.
 *
 * Brand is type-level only. For display, slice the decimal-string form
 * (`x.toString().padStart(7, '0')` -> insert `.` at position -6). Never
 * divide by 1e6 in float arithmetic.
 */
export type AmountUsdMicros = bigint & {
    readonly __brand: "AmountUsdMicros";
};
/**
 * Integer basis points. 1 bp = 0.01 %. Always non-negative.
 * 10_000 bp = 100 %.
 */
export type BasisPoints = number & {
    readonly __brand: "BasisPoints";
};
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
 */
export type Fee = ({
    kind: "native";
    label: string;
    amountNative: AmountBase;
} | {
    kind: "source";
    label: string;
    amountSource: AmountBase;
} | {
    kind: "destination";
    label: string;
    amountDest: AmountBase;
} | {
    kind: "protocol";
    label: string;
    asset: AssetRef;
    amount: AmountBase;
} | {
    kind: "usd";
    label: string;
    amountUsdMicros: AmountUsdMicros;
});
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
 */
export type Approval = {
    /**
     * - Discriminator over approval semantics. If `kind === 'noop'`, the approval MUST NOT be broadcast — skip it entirely.
     */
    kind: ApprovalKindValue;
    /**
     * - The asset being approved or set up.
     */
    asset: AssetRef;
    /**
     * - The contract address that will be allowed to move the asset.
     */
    spender: AddressString;
    /**
     * - Exact approval amount, in the asset's base units. Never infinite.
     */
    amount: AmountBase;
    /**
     * - The transaction the caller must sign and broadcast. Discriminate on `transaction.kind` before reading variant-specific fields.
     */
    transaction: UnsignedTransaction;
    /**
     * - Short human-readable reason ("approve OFT contract for cross-chain transfer").
     */
    rationale: string;
};
/**
 * Unsigned EVM transaction body (1559- or legacy-compatible). Atlas
 * never sets gas fields; the wallet account is responsible for gas.
 */
export type EvmUnsignedTx = {
    kind: "evm";
    chain: ChainRef;
    to: AddressString;
    /**
     * - Native asset value in wei.
     */
    value: bigint;
    /**
     * - Calldata. Empty `Uint8Array` for pure transfers.
     */
    data: Uint8Array;
};
/**
 * Unsigned Solana transaction as a serialised legacy or v0 message.
 */
export type SolanaUnsignedTx = {
    kind: "solana";
    chain: ChainRef;
    /**
     * - Serialised compiled message; the wallet account adds signatures.
     */
    message: Uint8Array;
    /**
     * - Accounts that must sign, in the order Solana expects.
     */
    requiredSigners: readonly AddressString[];
};
/**
 * Unsigned TON internal message body.
 */
export type TonUnsignedTx = {
    kind: "ton";
    chain: ChainRef;
    to: AddressString;
    /**
     * - Value in nanoTON.
     */
    value: bigint;
    /**
     * - BoC-encoded message body.
     */
    body: Uint8Array;
    /**
     * - TON send-mode flags.
     */
    sendMode: number;
};
/**
 * Unsigned Tron TRC-20 / TRC-10 transaction encoded as a raw_data hex
 * payload. The wallet account converts the hex to bytes before signing.
 */
export type TronUnsignedTx = {
    kind: "tron";
    chain: ChainRef;
    /**
     * - 0x-prefixed hex of the unsigned raw_data.
     */
    rawDataHex: string;
};
/**
 * A plain native-asset transfer abstracted from chain specifics. Used by
 * providers that hand back "just send X to Y" instructions on Bitcoin-like
 * chains where Atlas has no richer transaction model.
 */
export type TransferUnsignedTx = {
    kind: "transfer";
    chain: ChainRef;
    to: AddressString;
    amount: AmountBase;
    /**
     * - Optional memo bytes (e.g. for chains with memo fields).
     */
    memo?: Uint8Array;
};
/**
 * Tagged union of every unsigned transaction shape Atlas understands.
 * Always discriminate on `kind` before reading variant fields.
 */
export type UnsignedTransaction = EvmUnsignedTx | SolanaUnsignedTx | TonUnsignedTx | TronUnsignedTx | TransferUnsignedTx;
/**
 * Caller's routing preferences. All fields are optional; defaults are
 * provider-dependent but Atlas documents the expected defaults in
 * SCHEMA.md.
 */
export type PreferencesInput = {
    /**
     * - What to optimise the route for.
     */
    optimiseFor?: OptimisationValue;
    /**
     * - End-to-end slippage tolerance in basis points (e.g. `50` for 0.50 %). Range [0, 10_000]. Adapters MUST reject out-of-range values with `AtlasInvalidInputError`.
     */
    slippageBps?: BasisPoints;
    /**
     * - Caller-supplied deadline; route must complete by this time. Distinct from `Quote.expiresAtUnixSec` which is provider-supplied price freshness.
     */
    deadlineUnixSec?: UnixSec;
    /**
     * - End-to-end cap on the SUM of all `Fee` entries with `kind === 'native'`, denominated in the *source chain's* native gas asset. Adapters MUST raise `AtlasFeeCapExceededError` BEFORE broadcasting any transaction.
     */
    maxFeeNative?: AmountBase;
    /**
     * - Allowlist; if set, only these providers may be considered.
     */
    providers?: readonly ProviderId[];
    /**
     * - Denylist; takes precedence over `providers`.
     */
    excludeProviders?: readonly ProviderId[];
    /**
     * - Constrain which chains a multi-leg route may pass through.
     */
    allowedIntermediateChains?: readonly ChainRef[];
    /**
     * - Hard limit on the number of legs in the route. Must be >= 1 if provided. Provider chooses a default otherwise.
     */
    maxLegs?: number;
    /**
     * - Caller-defined id surfaced through logs and provider telemetry.
     */
    correlationId?: CorrelationId;
};
/**
 * Input to `quote()`. All amounts are in the base unit of the source
 * asset.
 */
export type QuoteInput = {
    /**
     * - Source asset.
     */
    fromAsset: AssetRef;
    /**
     * - Destination asset.
     */
    toAsset: AssetRef;
    /**
     * - Exact input amount, in `fromAsset` base units. Accepts `number | bigint`; adapters coerce to `AmountBase` via `BigInt(x)` internally. Use `bigint` for any value that may exceed `Number.MAX_SAFE_INTEGER`.
     */
    amountSource: AmountInput;
    /**
     * - Sender address on the source chain.
     */
    fromAddress: AddressString;
    /**
     * - Recipient address on the destination chain. May equal `fromAddress` for same-recipient routes.
     */
    toAddress: AddressString;
    /**
     * - Optional routing preferences.
     */
    preferences?: PreferencesInput;
};
/**
 * A single leg of a route. Atomically executable on its own chain; a
 * multi-leg route is a sequence of legs in execution order.
 *
 * Adjacent legs must chain: `legs[i].toAsset === legs[i+1].fromAsset`
 * (same chain AND address). Adapter responsibility.
 */
export type RouteLeg = {
    /**
     * - 0-based position within the parent route.
     */
    index: number;
    /**
     * - The provider responsible for this leg.
     */
    provider: ProviderId;
    /**
     * - The chain the leg executes on.
     */
    chain: ChainRef;
    /**
     * - Input asset of this leg.
     */
    fromAsset: AssetRef;
    /**
     * - Output asset of this leg.
     */
    toAsset: AssetRef;
    /**
     * - Expected input to this leg, in `fromAsset` base units.
     */
    amountIn: AmountBase;
    /**
     * - Expected output, in `toAsset` base units. Indicative; not a guarantee.
     */
    amountOutExpected: AmountBase;
    /**
     * - Read-only per-leg floor derived from the route's end-to-end slippage; if actual output dips below this, the leg fails. Must satisfy `minAmountOut <= amountOutExpected`. See SCHEMA.md §Route and RouteLeg invariants.
     */
    minAmountOut: AmountBase;
    /**
     * - All fees attributed to this leg.
     */
    fees: readonly Fee[];
    /**
     * - Provider's expected leg duration (e.g. bridge settlement time).
     */
    expectedDurationSec: DurationSec;
    /**
     * - Setup transactions required before this leg's `transactions[]`.
     */
    approvals: readonly Approval[];
    /**
     * - Ordered transactions to broadcast for this leg. Each must be signed and broadcast by the caller in order.
     */
    transactions: readonly UnsignedTransaction[];
    /**
     * - Opaque provider-supplied per-leg reference for status tracking.
     */
    providerLegRef?: string;
};
/**
 * A complete route from `fromAsset` to `toAsset`, potentially spanning
 * multiple chains. Atomicity across legs is **never** claimed; cross-chain
 * routes can terminate in `partially_completed` with funds parked on an
 * intermediate chain.
 */
export type Route = {
    /**
     * - Provider-issued handle binding this route to its later execution.
     */
    providerRouteId: ProviderRouteId;
    /**
     * - The provider that produced this route.
     */
    provider: ProviderId;
    fromAsset: AssetRef;
    toAsset: AssetRef;
    /**
     * - Exact input amount, as supplied in `QuoteInput`.
     */
    amountSource: AmountBase;
    /**
     * - Expected end-to-end output, in `toAsset` base units.
     */
    amountDestExpected: AmountBase;
    /**
     * - End-to-end output floor, equal to the final leg's `minAmountOut`.
     */
    minAmountOut: AmountBase;
    /**
     * - The end-to-end slippage tolerance applied when computing `minAmountOut`.
     */
    slippageBps: BasisPoints;
    /**
     * - Ordered legs. Length >= 1. See SCHEMA.md for the full invariant list.
     */
    legs: readonly RouteLeg[];
    /**
     * - All fees from all legs, surfaced for at-a-glance review. Sum equality is *not* required between this list and the per-leg lists if a provider charges out-of-band fees; see SCHEMA.md.
     */
    feesAggregated: readonly Fee[];
    /**
     * - Sum of per-leg expected durations.
     */
    expectedDurationSec: DurationSec;
    /**
     * - Brief audit trail of other providers Atlas considered and why they were not chosen.
     */
    alternativesConsidered: readonly {
        providerId: ProviderId;
        reason: string;
    }[];
};
/**
 * A priced route ready for caller review. A `Quote` is a `Route` plus
 * freshness metadata and a (possibly empty) ranked list of alternative
 * routes. `Quote.route` is always Atlas's recommended choice given the
 * caller's `PreferencesInput.optimiseFor`.
 */
export type Quote = {
    /**
     * - Recommended route.
     */
    route: Route;
    /**
     * - Other viable routes, ranked. May be empty.
     */
    alternatives: readonly Route[];
    /**
     * - When the quote was generated.
     */
    quotedAtUnixSec: UnixSec;
    /**
     * - Provider-declared expiry; calling `prepare()` after this time throws `AtlasQuoteExpiredError`.
     */
    expiresAtUnixSec: UnixSec;
    /**
     * - The criterion used to choose `route`.
     */
    optimisedFor: OptimisationValue;
    /**
     * - Echoed back from the caller's `PreferencesInput.correlationId` if supplied.
     */
    correlationId?: CorrelationId;
};
/**
 * Output of `prepare()`. The caller signs and broadcasts each transaction
 * in `approvals[]` first, then walks each leg in order broadcasting
 * `legs[i].transactions` in sequence.
 *
 * `RoutePreparation` is itself derived from `Quote.route`; the caller
 * should hold both. Re-preparing a route after expiry is the only
 * supported recovery from an expired quote.
 */
export type RoutePreparation = {
    providerRouteId: ProviderRouteId;
    provider: ProviderId;
    /**
     * - Echo of the priced route this preparation belongs to.
     */
    route: Route;
    /**
     * - All approvals from all legs, flattened in execution order. Already included inside each leg, surfaced again for caller convenience.
     */
    approvals: readonly Approval[];
    preparedAtUnixSec: UnixSec;
    /**
     * - Mirrors `Quote.expiresAtUnixSec`.
     */
    expiresAtUnixSec: UnixSec;
};
/**
 * Per-leg execution record returned by `getStatus()`.
 */
export type LegExecutionRecord = {
    legIndex: number;
    /**
     * - Per-leg status; lifecycle is the same closed set as the route's.
     */
    status: AtlasStatusValue;
    /**
     * - All transactions broadcast for this leg. Broadcast order, earliest first.
     */
    txHashes: readonly TxHashString[];
    /**
     * - Set once the leg settles; in `RouteLeg.toAsset` base units.
     */
    amountOutActual?: AmountBase;
    /**
     * - Optional URL for caller display.
     */
    explorerUrl?: string;
    /**
     * - Free-text from provider if `status === 'failed'`. Not a stable contract.
     */
    errorMessage?: string;
};
/**
 * Status snapshot of an in-flight or completed route execution.
 */
export type RouteExecution = {
    providerRouteId: ProviderRouteId;
    provider: ProviderId;
    /**
     * - End-to-end status; see SCHEMA.md for the transition diagram.
     */
    status: AtlasStatusValue;
    /**
     * - One record per leg, in route order.
     */
    legs: readonly LegExecutionRecord[];
    /**
     * - Final actual output, in `toAsset` base units; populated once `status === 'succeeded'`.
     */
    amountDestActual?: AmountBase;
    /**
     * - Populated when `status === 'partially_completed'`. Describes funds that ended up on an intermediate chain and how the caller can recover them.
     */
    recoverableLegs?: readonly {
        legIndex: number;
        chain: ChainRef;
        asset: AssetRef;
        amount: AmountBase;
        recoveryHint: string;
    }[];
    updatedAtUnixSec: UnixSec;
};
/**
 * Optional sink for diagnostic messages. Atlas calls these methods at
 * coarse milestones; it never logs secrets, addresses in full, or signed
 * payloads.
 */
export type AtlasLogger = {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
};
