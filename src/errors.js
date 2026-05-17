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

import { AtlasErrorCode, AtlasErrorSeverity } from './constants.js'

/** @typedef {import('./constants.js').AtlasErrorCodeValue} AtlasErrorCodeValue */
/** @typedef {import('./constants.js').AtlasErrorSeverityValue} AtlasErrorSeverityValue */
/** @typedef {import('./types.js').ProviderId} ProviderId */
/** @typedef {import('./types.js').CorrelationId} CorrelationId */

/**
 * Optional metadata attached to any `AtlasError`. None of these fields
 * are load-bearing; they exist to help callers display context to users.
 *
 * @typedef {object} AtlasErrorContext
 * @property {ProviderId} [provider] - The provider responsible, if known.
 * @property {string} [providerMessage] - Verbatim message from the provider, redacted of any secrets.
 * @property {string | number} [providerCode] - The provider's own error code, opaque to Atlas.
 * @property {CorrelationId} [correlationId]
 */

/**
 * Base class for every typed error Atlas raises. Callers should
 * discriminate on `severity` first, then on `code` for display.
 *
 * Never throw raw strings; never throw plain `Error`. Adapter authors
 * extend one of the typed subclasses below.
 */
export class AtlasError extends Error {
  /**
   * @param {object} init
   * @param {string} init.message - Short, programmer-readable explanation. Do not include secrets, full addresses, or signed payloads.
   * @param {AtlasErrorCodeValue} init.code - One of the `AtlasErrorCode` values.
   * @param {AtlasErrorSeverityValue} init.severity - One of the `AtlasErrorSeverity` values.
   * @param {AtlasErrorContext} [init.context] - Optional provider / correlation context.
   * @param {Error} [init.cause] - Underlying cause for `Error.cause`.
   */
  constructor ({ message, code, severity, context, cause }) {
    super(message, cause === undefined ? undefined : { cause })

    /** @type {string} */
    this.name = 'AtlasError'

    /** @type {AtlasErrorCodeValue} */
    this.code = code

    /** @type {AtlasErrorSeverityValue} */
    this.severity = severity

    /** @type {AtlasErrorContext | undefined} */
    this.context = context
  }
}

/**
 * Caller-supplied input failed local validation (bad amount, mismatched
 * chains, malformed address). Safe to surface to the user verbatim
 * after redaction.
 */
export class AtlasInvalidInputError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.InvalidInput,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasInvalidInputError'
  }
}

/**
 * No provider could produce a route for the requested asset pair and
 * preferences.
 */
export class AtlasUnsupportedRouteError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.UnsupportedRoute,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasUnsupportedRouteError'
  }
}

/**
 * A referenced `ChainRef` is not supported by the active adapter.
 */
export class AtlasChainUnsupportedError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.ChainUnsupported,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasChainUnsupportedError'
  }
}

/**
 * A provider returned a malformed or contractually-invalid response.
 * Severity is `provider_broken` because retrying the same provider will
 * not help.
 */
export class AtlasProviderError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.ProviderError,
      severity: AtlasErrorSeverity.ProviderBroken,
      context,
      cause
    })

    this.name = 'AtlasProviderError'
  }
}

/**
 * Provider is reachable but currently failing (HTTP 5xx, timeouts,
 * rate limits). Safe to retry after a backoff.
 */
export class AtlasProviderUnavailableError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.ProviderUnavailable,
      severity: AtlasErrorSeverity.Retryable,
      context,
      cause
    })

    this.name = 'AtlasProviderUnavailableError'
  }
}

/**
 * Quote's `expiresAtUnixSec` has passed. Caller must re-quote.
 */
export class AtlasQuoteExpiredError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.QuoteExpired,
      severity: AtlasErrorSeverity.Retryable,
      context,
      cause
    })

    this.name = 'AtlasQuoteExpiredError'
  }
}

/**
 * A signing operation was attempted on a read-only-account construction.
 */
export class AtlasReadOnlyAccountError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.ReadOnlyAccount,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasReadOnlyAccountError'
  }
}

/**
 * Estimated total fee exceeded `PreferencesInput.maxFeeNative`. No
 * transaction was broadcast.
 */
export class AtlasFeeCapExceededError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.FeeCapExceeded,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasFeeCapExceededError'
  }
}

/**
 * Actual on-chain output was below `Route.minAmountOut` (or a per-leg
 * floor). May be raised after a transaction has confirmed; severity is
 * `funds_at_risk` because the user's funds have moved.
 */
export class AtlasSlippageExceededError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.SlippageExceeded,
      severity: AtlasErrorSeverity.FundsAtRisk,
      context,
      cause
    })

    this.name = 'AtlasSlippageExceededError'
  }
}

/**
 * Caller's on-chain balance is below the required input. No
 * transaction broadcast.
 */
export class AtlasInsufficientBalanceError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.InsufficientBalance,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasInsufficientBalanceError'
  }
}

/**
 * Required ERC-20 allowance / SPL ATA / equivalent is missing. The
 * `RoutePreparation.approvals[]` was not executed before `execute()`.
 */
export class AtlasInsufficientAllowanceError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.InsufficientAllowance,
      severity: AtlasErrorSeverity.Investigate,
      context,
      cause
    })

    this.name = 'AtlasInsufficientAllowanceError'
  }
}

/**
 * A leg succeeded but the route did not complete, leaving funds on an
 * intermediate chain. Raised by `getStatus()` when status transitions
 * to `partially_completed`. See `RouteExecution.recoverableLegs`.
 */
export class AtlasFundsAtRiskError extends AtlasError {
  /**
   * @param {string} message
   * @param {AtlasErrorContext} [context]
   * @param {Error} [cause]
   */
  constructor (message, context, cause) {
    super({
      message,
      code: AtlasErrorCode.FundsAtRisk,
      severity: AtlasErrorSeverity.FundsAtRisk,
      context,
      cause
    })

    this.name = 'AtlasFundsAtRiskError'
  }
}

/**
 * Thrown by `AtlasProtocol`'s abstract methods. Subclasses must
 * override every method this class throws.
 */
export class AtlasNotImplementedError extends AtlasError {
  /**
   * @param {string} method - Name of the abstract method that was invoked.
   */
  constructor (method) {
    super({
      message: `AtlasProtocol.${method}() is abstract and must be overridden by a subclass.`,
      code: AtlasErrorCode.NotImplemented,
      severity: AtlasErrorSeverity.Investigate
    })

    this.name = 'AtlasNotImplementedError'
  }
}
