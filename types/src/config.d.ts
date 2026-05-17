export type ChainRef = import("./types.js").ChainRef;
export type AddressString = import("./types.js").AddressString;
export type ProviderId = import("./types.js").ProviderId;
export type UnixSec = import("./types.js").UnixSec;
export type DurationSec = import("./types.js").DurationSec;
export type AtlasLogger = import("./types.js").AtlasLogger;
export type ChainNamespaceValue = import("./constants.js").ChainNamespaceValue;
/**
 * Static chain metadata Atlas needs to validate inputs and surface to
 * adapters. Adapters are free to extend this with their own per-chain
 * config keyed off `ChainRef`.
 */
export type ChainConfig = {
    /**
     * - Canonical CAIP-2 chain reference.
     */
    chain: ChainRef;
    /**
     * - The `chain.split(':')[0]` value, surfaced for ergonomic switching.
     */
    namespace: ChainNamespaceValue;
    /**
     * - Human-readable name for logs and UI ("Ethereum", "Solana").
     */
    displayName: string;
    /**
     * - The sentinel address used to mean "native asset" in adapter calls; conventionally the zero address on EVM, but chain-specific elsewhere.
     */
    nativeAssetAddressSentinel: AddressString;
    /**
     * - Decimal places of the native asset (18 for EVM, 9 for Solana, 9 for TON).
     */
    nativeDecimals: number;
    /**
     * - Used for status polling intervals; informational only.
     */
    averageBlockTimeSec: DurationSec;
};
/**
 * Per-provider static configuration. Adapters extend this with their
 * own credentials and endpoint fields.
 */
export type ProviderConfig = {
    providerId: ProviderId;
    displayName: string;
    /**
     * - Optional base URL for REST-backed providers; omitted for SDK-only providers.
     */
    endpoint?: string;
    /**
     * - Per-request timeout the adapter MUST honour. Default decided by the adapter.
     */
    requestTimeoutSec?: DurationSec;
};
/**
 * Constructor configuration for `AtlasProtocol` subclasses. Mirrors
 * the shape of `BridgeProtocolConfig` from the WDK bridge reference,
 * plus Atlas-specific knobs.
 *
 * Every field is optional. Adapters MAY require additional fields by
 * extending this type in their own package.
 */
export type AtlasProtocolConfig = {
    /**
     * - Chain registry keyed by CAIP-2 ChainRef. Adapters look up with `config.chains?.[chainRef]`. If omitted, the adapter uses its built-in registry.
     */
    chains?: Readonly<Record<ChainRef, ChainConfig>>;
    /**
     * - Static provider configuration. Adapters that only ever wrap one provider may ignore this.
     */
    provider?: ProviderConfig;
    /**
     * - Optional diagnostic logger. Defaults to a no-op.
     */
    logger?: AtlasLogger;
    /**
     * - Injected clock for testability. Defaults to `() => Math.floor(Date.now() / 1000)`.
     */
    now?: () => UnixSec;
    /**
     * - Fallback TTL applied when a provider does not declare one. SCHEMA.md recommends 30s.
     */
    defaultQuoteTtlSec?: DurationSec;
};
