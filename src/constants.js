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

/**
 * Semantic protocol version. Bumped on breaking changes to the
 * `AtlasProtocol` abstract surface or to any exported typedef.
 *
 * Adapters declare the protocol version they were built against to
 * help wallets warn on incompatibility.
 */
export const ATLAS_PROTOCOL_VERSION = '0.1.0-alpha.0'

/**
 * Closed set of route / leg lifecycle states. See SCHEMA.md for the
 * permitted transitions.
 *
 * @readonly
 * @enum {string}
 */
export const AtlasStatus = Object.freeze({
  /** Route created, no transactions touched. */
  Preparing: 'preparing',
  /** Setup transactions (approvals) waiting for the caller to broadcast. */
  AwaitingApproval: 'awaiting_approval',
  /** Main leg transactions waiting for caller signature. */
  AwaitingSignature: 'awaiting_signature',
  /** At least one transaction broadcast, not yet confirmed. */
  Broadcast: 'broadcast',
  /** Broadcast and accepted on-chain, waiting for confirmations. */
  Confirming: 'confirming',
  /** Bridge or cross-chain message in flight between two legs. */
  Bridging: 'bridging',
  /** Final leg settling on the destination chain. */
  Settling: 'settling',
  /** Terminal: route completed end-to-end. */
  Succeeded: 'succeeded',
  /** Terminal: at least one leg succeeded but the route did not complete; funds may be parked on an intermediate chain. See `RouteExecution.recoverableLegs`. */
  PartiallyCompleted: 'partially_completed',
  /** Terminal: at least one leg failed and no funds advanced. */
  Failed: 'failed',
  /** Terminal: quote expired before execution began. */
  Expired: 'expired',
  /** Terminal: caller cancelled before broadcast. */
  Cancelled: 'cancelled'
})

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
export const AtlasErrorCode = Object.freeze({
  InvalidInput: 'INVALID_INPUT',
  UnsupportedRoute: 'UNSUPPORTED_ROUTE',
  ChainUnsupported: 'CHAIN_UNSUPPORTED',
  ProviderUnavailable: 'PROVIDER_UNAVAILABLE',
  ProviderError: 'PROVIDER_ERROR',
  QuoteExpired: 'QUOTE_EXPIRED',
  ReadOnlyAccount: 'READ_ONLY_ACCOUNT',
  FeeCapExceeded: 'FEE_CAP_EXCEEDED',
  SlippageExceeded: 'SLIPPAGE_EXCEEDED',
  InsufficientBalance: 'INSUFFICIENT_BALANCE',
  InsufficientAllowance: 'INSUFFICIENT_ALLOWANCE',
  FundsAtRisk: 'FUNDS_AT_RISK',
  NotImplemented: 'NOT_IMPLEMENTED'
})

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
export const AtlasErrorSeverity = Object.freeze({
  Retryable: 'retryable',
  Investigate: 'investigate',
  FundsAtRisk: 'funds_at_risk',
  ProviderBroken: 'provider_broken'
})

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
export const ApprovalKind = Object.freeze({
  Erc20Approve: 'erc20_approve',
  SplAtaCreate: 'spl_ata_create',
  TonJettonInit: 'ton_jetton_init',
  Trc20Approve: 'trc20_approve',
  /** No approval required; surfaced for shape symmetry. */
  Noop: 'noop'
})

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
export const ChainNamespace = Object.freeze({
  Eip155: 'eip155',
  Solana: 'solana',
  Tron: 'tron',
  Ton: 'ton',
  Cosmos: 'cosmos',
  Bitcoin: 'bip122'
})

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
export const KnownChain = Object.freeze({
  Ethereum: /** @type {import('./types.js').ChainRef} */ ('eip155:1'),
  Arbitrum: /** @type {import('./types.js').ChainRef} */ ('eip155:42161'),
  Optimism: /** @type {import('./types.js').ChainRef} */ ('eip155:10'),
  Polygon: /** @type {import('./types.js').ChainRef} */ ('eip155:137'),
  Avalanche: /** @type {import('./types.js').ChainRef} */ ('eip155:43114'),
  Solana: /** @type {import('./types.js').ChainRef} */ ('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'),
  Tron: /** @type {import('./types.js').ChainRef} */ ('tron:0x2b6653dc'),
  Ton: /** @type {import('./types.js').ChainRef} */ ('ton:-239'),
  Bitcoin: /** @type {import('./types.js').ChainRef} */ ('bip122:000000000019d6689c085ae165831e93')
})

/**
 * Discriminator for `Fee.kind`. See `Fee` typedef in `types.js` for
 * variant semantics.
 *
 * @readonly
 * @enum {string}
 */
export const FeeKind = Object.freeze({
  Native: 'native',
  Source: 'source',
  Destination: 'destination',
  Protocol: 'protocol',
  Usd: 'usd'
})

/**
 * @typedef {(typeof FeeKind)[keyof typeof FeeKind]} FeeKindValue
 */

/**
 * Discriminator for `UnsignedTransaction.kind`.
 *
 * @readonly
 * @enum {string}
 */
export const TransactionKind = Object.freeze({
  Evm: 'evm',
  Solana: 'solana',
  Ton: 'ton',
  Tron: 'tron',
  Transfer: 'transfer'
})

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
export const Optimisation = Object.freeze({
  Output: 'output',
  Fee: 'fee',
  Speed: 'speed',
  Security: 'security',
  Balanced: 'balanced'
})

/**
 * @typedef {(typeof Optimisation)[keyof typeof Optimisation]} OptimisationValue
 */
