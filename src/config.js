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

/** @typedef {import('./types.js').ChainRef} ChainRef */
/** @typedef {import('./types.js').AddressString} AddressString */
/** @typedef {import('./types.js').ProviderId} ProviderId */
/** @typedef {import('./types.js').UnixSec} UnixSec */
/** @typedef {import('./types.js').DurationSec} DurationSec */
/** @typedef {import('./types.js').AtlasLogger} AtlasLogger */
/** @typedef {import('./constants.js').ChainNamespaceValue} ChainNamespaceValue */

/**
 * Static chain metadata Atlas needs to validate inputs and surface to
 * adapters. Adapters are free to extend this with their own per-chain
 * config keyed off `ChainRef`.
 *
 * @typedef {object} ChainConfig
 * @property {ChainRef} chain - Canonical CAIP-2 chain reference.
 * @property {ChainNamespaceValue} namespace - The `chain.split(':')[0]` value, surfaced for ergonomic switching.
 * @property {string} displayName - Human-readable name for logs and UI ("Ethereum", "Solana").
 * @property {AddressString} nativeAssetAddressSentinel - The sentinel address used to mean "native asset" in adapter calls; conventionally the zero address on EVM, but chain-specific elsewhere.
 * @property {number} nativeDecimals - Decimal places of the native asset (18 for EVM, 9 for Solana, 9 for TON).
 * @property {DurationSec} averageBlockTimeSec - Used for status polling intervals; informational only.
 */

/**
 * Per-provider static configuration. Adapters extend this with their
 * own credentials and endpoint fields.
 *
 * @typedef {object} ProviderConfig
 * @property {ProviderId} providerId
 * @property {string} displayName
 * @property {string} [endpoint] - Optional base URL for REST-backed providers; omitted for SDK-only providers.
 * @property {DurationSec} [requestTimeoutSec] - Per-request timeout the adapter MUST honour. Default decided by the adapter.
 */

/**
 * Constructor configuration for `AtlasProtocol` subclasses. Mirrors
 * the shape of `BridgeProtocolConfig` from the WDK bridge reference,
 * plus Atlas-specific knobs.
 *
 * Every field is optional. Adapters MAY require additional fields by
 * extending this type in their own package.
 *
 * @typedef {object} AtlasProtocolConfig
 * @property {Readonly<Record<ChainRef, ChainConfig>>} [chains] - Chain registry keyed by CAIP-2 ChainRef. Adapters look up with `config.chains?.[chainRef]`. If omitted, the adapter uses its built-in registry.
 * @property {ProviderConfig} [provider] - Static provider configuration. Adapters that only ever wrap one provider may ignore this.
 * @property {AtlasLogger} [logger] - Optional diagnostic logger. Defaults to a no-op.
 * @property {() => UnixSec} [now] - Injected clock for testability. Defaults to `() => Math.floor(Date.now() / 1000)`.
 * @property {DurationSec} [defaultQuoteTtlSec] - Fallback TTL applied when a provider does not declare one. SCHEMA.md recommends 30s.
 */

// JSDoc-typedef-only module; no runtime exports.
export {}
