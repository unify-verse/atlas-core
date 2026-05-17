/**
 * Semantic protocol version. Bumped on breaking changes to the
 * `AtlasProtocol` abstract surface or to any exported typedef.
 *
 * Adapters declare the protocol version they were built against to
 * help wallets warn on incompatibility.
 */
export const ATLAS_PROTOCOL_VERSION: "0.1.0-alpha.0";
/**
 * Closed set of route / leg lifecycle states. See SCHEMA.md for the
 * permitted transitions.
 */
export type AtlasStatus = string;
/**
 * Closed set of route / leg lifecycle states. See SCHEMA.md for the
 * permitted transitions.
 *
 * @readonly
 * @enum {string}
 */
export const AtlasStatus: Readonly<{
    /** Route created, no transactions touched. */
    Preparing: "preparing";
    /** Setup transactions (approvals) waiting for the caller to broadcast. */
    AwaitingApproval: "awaiting_approval";
    /** Main leg transactions waiting for caller signature. */
    AwaitingSignature: "awaiting_signature";
    /** At least one transaction broadcast, not yet confirmed. */
    Broadcast: "broadcast";
    /** Broadcast and accepted on-chain, waiting for confirmations. */
    Confirming: "confirming";
    /** Bridge or cross-chain message in flight between two legs. */
    Bridging: "bridging";
    /** Final leg settling on the destination chain. */
    Settling: "settling";
    /** Terminal: route completed end-to-end. */
    Succeeded: "succeeded";
    /** Terminal: at least one leg succeeded but the route did not complete; funds may be parked on an intermediate chain. See `RouteExecution.recoverableLegs`. */
    PartiallyCompleted: "partially_completed";
    /** Terminal: at least one leg failed and no funds advanced. */
    Failed: "failed";
    /** Terminal: quote expired before execution began. */
    Expired: "expired";
    /** Terminal: caller cancelled before broadcast. */
    Cancelled: "cancelled";
}>;
/**
 * Closed set of error codes Atlas can surface. Adapters MUST use one
 * of these for `AtlasError.code`. Provider-specific error strings live
 * in `AtlasError.providerMessage`, not here.
 */
export type AtlasErrorCode = string;
/**
 * @typedef {(typeof AtlasStatus)[keyof typeof AtlasStatus]} AtlasStatusValue
 */
/**
 * Closed set of error codes Atlas can surface. Adapters MUST use one
 * of these for `AtlasError.code`. Provider-specific error strings live
 * in `AtlasError.providerMessage`, not here.
 *
 * @readonly
 * @enum {string}
 */
export const AtlasErrorCode: Readonly<{
    InvalidInput: "INVALID_INPUT";
    UnsupportedRoute: "UNSUPPORTED_ROUTE";
    ChainUnsupported: "CHAIN_UNSUPPORTED";
    ProviderUnavailable: "PROVIDER_UNAVAILABLE";
    ProviderError: "PROVIDER_ERROR";
    QuoteExpired: "QUOTE_EXPIRED";
    ReadOnlyAccount: "READ_ONLY_ACCOUNT";
    FeeCapExceeded: "FEE_CAP_EXCEEDED";
    SlippageExceeded: "SLIPPAGE_EXCEEDED";
    InsufficientBalance: "INSUFFICIENT_BALANCE";
    InsufficientAllowance: "INSUFFICIENT_ALLOWANCE";
    FundsAtRisk: "FUNDS_AT_RISK";
    NotImplemented: "NOT_IMPLEMENTED";
}>;
/**
 * Error severity axis. Callers branch on this, not on `code`, when
 * deciding whether to retry.
 *
 * - `'retryable'`: transient — same call may succeed again shortly.
 * - `'investigate'`: caller's input or environment needs attention.
 * - `'funds_at_risk'`: an on-chain action is in flight or stuck; do
 *   not retry blindly. Surface to the user.
 * - `'provider_broken'`: the upstream provider is wrong; switch
 *   providers or escalate.
 */
export type AtlasErrorSeverity = string;
/**
 * @typedef {(typeof AtlasErrorCode)[keyof typeof AtlasErrorCode]} AtlasErrorCodeValue
 */
/**
 * Error severity axis. Callers branch on this, not on `code`, when
 * deciding whether to retry.
 *
 * - `'retryable'`: transient — same call may succeed again shortly.
 * - `'investigate'`: caller's input or environment needs attention.
 * - `'funds_at_risk'`: an on-chain action is in flight or stuck; do
 *   not retry blindly. Surface to the user.
 * - `'provider_broken'`: the upstream provider is wrong; switch
 *   providers or escalate.
 *
 * @readonly
 * @enum {string}
 */
export const AtlasErrorSeverity: Readonly<{
    Retryable: "retryable";
    Investigate: "investigate";
    FundsAtRisk: "funds_at_risk";
    ProviderBroken: "provider_broken";
}>;
/**
 * Discriminator for `Approval.kind`. Each value documents the on-chain
 * primitive being performed.
 */
export type ApprovalKind = string;
/**
 * @typedef {(typeof AtlasErrorSeverity)[keyof typeof AtlasErrorSeverity]} AtlasErrorSeverityValue
 */
/**
 * Discriminator for `Approval.kind`. Each value documents the on-chain
 * primitive being performed.
 *
 * @readonly
 * @enum {string}
 */
export const ApprovalKind: Readonly<{
    Erc20Approve: "erc20_approve";
    SplAtaCreate: "spl_ata_create";
    TonJettonInit: "ton_jetton_init";
    Trc20Approve: "trc20_approve";
    /** No approval required; surfaced for shape symmetry. */
    Noop: "noop";
}>;
/**
 * Chain namespace following CAIP-2 prefixes. The `ChainRef` brand pairs
 * a namespace with a chain-specific id, e.g. `"eip155:1"`.
 */
export type ChainNamespace = string;
/**
 * @typedef {(typeof ApprovalKind)[keyof typeof ApprovalKind]} ApprovalKindValue
 */
/**
 * Chain namespace following CAIP-2 prefixes. The `ChainRef` brand pairs
 * a namespace with a chain-specific id, e.g. `"eip155:1"`.
 *
 * @readonly
 * @enum {string}
 */
export const ChainNamespace: Readonly<{
    Eip155: "eip155";
    Solana: "solana";
    Tron: "tron";
    Ton: "ton";
    Cosmos: "cosmos";
    Bitcoin: "bip122";
}>;
/**
 * @typedef {(typeof ChainNamespace)[keyof typeof ChainNamespace]} ChainNamespaceValue
 */
/**
 * Chains Atlas ships out-of-the-box `ChainRef` constants for. Unknown
 * chains are not rejected by the type system; they are rejected at the
 * provider layer with `AtlasChainUnsupportedError`.
 *
 * Values follow CAIP-2 exactly so adapters can decode them with
 * `chain.split(':')`.
 *
 * @readonly
 */
export const KnownChain: Readonly<{
    Ethereum: import("./types.js").ChainRef;
    Arbitrum: import("./types.js").ChainRef;
    Optimism: import("./types.js").ChainRef;
    Polygon: import("./types.js").ChainRef;
    Avalanche: import("./types.js").ChainRef;
    Solana: import("./types.js").ChainRef;
    Tron: import("./types.js").ChainRef;
    Ton: import("./types.js").ChainRef;
    Bitcoin: import("./types.js").ChainRef;
}>;
/**
 * Discriminator for `Fee.kind`. See `Fee` typedef in `types.js` for
 * variant semantics.
 */
export type FeeKind = string;
/**
 * Discriminator for `Fee.kind`. See `Fee` typedef in `types.js` for
 * variant semantics.
 *
 * @readonly
 * @enum {string}
 */
export const FeeKind: Readonly<{
    Native: "native";
    Source: "source";
    Destination: "destination";
    Protocol: "protocol";
    Usd: "usd";
}>;
/**
 * Discriminator for `UnsignedTransaction.kind`.
 */
export type TransactionKind = string;
/**
 * @typedef {(typeof FeeKind)[keyof typeof FeeKind]} FeeKindValue
 */
/**
 * Discriminator for `UnsignedTransaction.kind`.
 *
 * @readonly
 * @enum {string}
 */
export const TransactionKind: Readonly<{
    Evm: "evm";
    Solana: "solana";
    Ton: "ton";
    Tron: "tron";
    Transfer: "transfer";
}>;
/**
 * Optimisation criteria the caller may pass via `PreferencesInput.optimiseFor`.
 *
 * - `'output'`: maximise destination amount.
 * - `'fee'`: minimise total fees.
 * - `'speed'`: minimise expected duration.
 * - `'security'`: prefer providers Atlas considers higher trust (see SCHEMA.md).
 * - `'balanced'`: provider's default trade-off.
 */
export type Optimisation = string;
/**
 * @typedef {(typeof TransactionKind)[keyof typeof TransactionKind]} TransactionKindValue
 */
/**
 * Optimisation criteria the caller may pass via `PreferencesInput.optimiseFor`.
 *
 * - `'output'`: maximise destination amount.
 * - `'fee'`: minimise total fees.
 * - `'speed'`: minimise expected duration.
 * - `'security'`: prefer providers Atlas considers higher trust (see SCHEMA.md).
 * - `'balanced'`: provider's default trade-off.
 *
 * @readonly
 * @enum {string}
 */
export const Optimisation: Readonly<{
    Output: "output";
    Fee: "fee";
    Speed: "speed";
    Security: "security";
    Balanced: "balanced";
}>;
export type AtlasStatusValue = (typeof AtlasStatus)[keyof typeof AtlasStatus];
export type AtlasErrorCodeValue = (typeof AtlasErrorCode)[keyof typeof AtlasErrorCode];
export type AtlasErrorSeverityValue = (typeof AtlasErrorSeverity)[keyof typeof AtlasErrorSeverity];
export type ApprovalKindValue = (typeof ApprovalKind)[keyof typeof ApprovalKind];
export type ChainNamespaceValue = (typeof ChainNamespace)[keyof typeof ChainNamespace];
export type FeeKindValue = (typeof FeeKind)[keyof typeof FeeKind];
export type TransactionKindValue = (typeof TransactionKind)[keyof typeof TransactionKind];
export type OptimisationValue = (typeof Optimisation)[keyof typeof Optimisation];
