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

import { AtlasNotImplementedError } from './errors.js'

/** @typedef {import('./types.js').QuoteInput} QuoteInput */
/** @typedef {import('./types.js').Quote} Quote */
/** @typedef {import('./types.js').Route} Route */
/** @typedef {import('./types.js').RoutePreparation} RoutePreparation */
/** @typedef {import('./types.js').RouteExecution} RouteExecution */
/** @typedef {import('./types.js').ProviderRouteId} ProviderRouteId */
/** @typedef {import('./types.js').AtlasWalletAccountLike} AtlasWalletAccountLike */
/** @typedef {import('./config.js').AtlasProtocolConfig} AtlasProtocolConfig */

/**
 * Abstract base for every Atlas adapter. Concrete adapters (Rango,
 * LayerZero, Jupiter, ...) extend this class and implement every
 * method below.
 *
 * The constructor signature mirrors `BridgeProtocol` from
 * `@tetherto/wdk-wallet/protocols`: an opaque `account` (a WDK wallet
 * account; type narrowed by each concrete adapter) plus optional
 * configuration. Atlas Core does not depend on `@tetherto/wdk-wallet`;
 * adapters bring that dependency.
 *
 * Lifecycle:
 *
 * 1. `quote(input)` -> `Quote`
 * 2. `prepare(route)` -> `RoutePreparation` (one selected `Route`)
 * 3. caller signs and broadcasts `preparation.approvals`, then each
 *    `route.legs[i].transactions` in order via the WDK wallet account
 * 4. `getStatus(providerRouteId)` -> `RouteExecution`, polled until
 *    terminal status
 *
 * Adapters MAY collapse step 2 and step 3 by exposing a convenience
 * `execute()` if and only if the underlying provider permits it
 * (single-leg, same-chain, signing account). Atlas Core does not
 * mandate `execute()`; it is therefore not declared on the abstract
 * base.
 */
export default class AtlasProtocol {
  /**
   * @param {AtlasWalletAccountLike} account - A WDK wallet account (read-only or signing). Concrete adapters narrow this type to the wallet variant they support.
   * @param {AtlasProtocolConfig} [config] - Optional protocol configuration.
   */
  constructor (account, config = {}) {
    /** @private */
    this._account = account

    /** @private */
    this._config = config
  }

  /**
   * Produce a priced route (or set of priced routes) from `input.fromAsset`
   * to `input.toAsset`. The returned `Quote.route` is Atlas's recommended
   * choice; `Quote.alternatives` lists other viable routes.
   *
   * Implementations must:
   * - validate `input` and throw `AtlasInvalidInputError` for bad
   *   amounts / chain mismatches / malformed addresses;
   * - reject unsupported chains with `AtlasChainUnsupportedError`;
   * - propagate provider failures as `AtlasProviderUnavailableError`
   *   (transient) or `AtlasProviderError` (contractually wrong);
   * - set `expiresAtUnixSec` from the provider's TTL, falling back to
   *   `AtlasProtocolConfig.defaultQuoteTtlSec` if the provider does
   *   not supply one.
   *
   * @param {QuoteInput} input - Quote request.
   * @returns {Promise<Quote>} The recommended route plus alternatives.
   * @throws {import('./errors.js').AtlasInvalidInputError} If `input` is malformed.
   * @throws {import('./errors.js').AtlasUnsupportedRouteError} If no provider can route this pair.
   * @throws {import('./errors.js').AtlasChainUnsupportedError} If a referenced chain is unknown to the adapter.
   * @throws {import('./errors.js').AtlasProviderUnavailableError} If the provider is reachable but failing.
   * @throws {import('./errors.js').AtlasProviderError} If the provider returns a malformed response.
   * @throws {import('./errors.js').AtlasNotImplementedError} Always, on the abstract base.
   */
  async quote (input) {
    throw new AtlasNotImplementedError('quote')
  }

  /**
   * Convert a priced `Route` into an executable `RoutePreparation`:
   * the ordered approvals and unsigned transactions the caller must
   * sign and broadcast via the WDK wallet account.
   *
   * Implementations must:
   * - refuse if `route` was issued by a different provider than this
   *   adapter handles (`AtlasInvalidInputError`);
   * - refuse if the quote expired (`AtlasQuoteExpiredError`);
   * - refuse if the construction-time account is read-only
   *   (`AtlasReadOnlyAccountError`);
   * - apply `AtlasProtocolConfig`-level `maxFeeNative` and throw
   *   `AtlasFeeCapExceededError` before producing transactions if
   *   the cap would be breached.
   *
   * @param {Route} route - One of `Quote.route` or `Quote.alternatives[i]`.
   * @returns {Promise<RoutePreparation>} Transactions ready for the caller to sign and broadcast.
   * @throws {import('./errors.js').AtlasInvalidInputError}
   * @throws {import('./errors.js').AtlasQuoteExpiredError}
   * @throws {import('./errors.js').AtlasReadOnlyAccountError}
   * @throws {import('./errors.js').AtlasFeeCapExceededError}
   * @throws {import('./errors.js').AtlasProviderUnavailableError}
   * @throws {import('./errors.js').AtlasProviderError}
   * @throws {import('./errors.js').AtlasNotImplementedError} Always, on the abstract base.
   */
  async prepare (route) {
    throw new AtlasNotImplementedError('prepare')
  }

  /**
   * Fetch the latest execution snapshot for a previously-prepared
   * route, identified by its `providerRouteId`. Safe to call on a
   * read-only account.
   *
   * Implementations must:
   * - distinguish in-flight states (`AtlasStatus.Broadcast`,
   *   `Confirming`, `Bridging`, `Settling`) from terminal states;
   * - populate `RouteExecution.recoverableLegs` when status becomes
   *   `partially_completed`;
   * - throw `AtlasFundsAtRiskError` only if the provider explicitly
   *   declares user funds are stuck. Mere in-flight uncertainty must
   *   surface as an in-progress status, not as an error.
   *
   * @param {ProviderRouteId} providerRouteId - The id returned in `RoutePreparation.providerRouteId`.
   * @returns {Promise<RouteExecution>} Latest known status snapshot.
   * @throws {import('./errors.js').AtlasInvalidInputError} If `providerRouteId` is malformed or unknown to the provider.
   * @throws {import('./errors.js').AtlasFundsAtRiskError} If the provider reports stuck funds.
   * @throws {import('./errors.js').AtlasProviderUnavailableError}
   * @throws {import('./errors.js').AtlasProviderError}
   * @throws {import('./errors.js').AtlasNotImplementedError} Always, on the abstract base.
   */
  async getStatus (providerRouteId) {
    throw new AtlasNotImplementedError('getStatus')
  }
}

export { AtlasProtocol }
