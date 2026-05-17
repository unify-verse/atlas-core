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
    constructor({ message, code, severity, context, cause }: {
        message: string;
        code: AtlasErrorCodeValue;
        severity: AtlasErrorSeverityValue;
        context?: AtlasErrorContext;
        cause?: Error;
    });
    /** @type {AtlasErrorCodeValue} */
    code: AtlasErrorCodeValue;
    /** @type {AtlasErrorSeverityValue} */
    severity: AtlasErrorSeverityValue;
    /** @type {AtlasErrorContext | undefined} */
    context: AtlasErrorContext | undefined;
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
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
    constructor(message: string, context?: AtlasErrorContext, cause?: Error);
}
/**
 * Thrown by `AtlasProtocol`'s abstract methods. Subclasses must
 * override every method this class throws.
 */
export class AtlasNotImplementedError extends AtlasError {
    /**
     * @param {string} method - Name of the abstract method that was invoked.
     */
    constructor(method: string);
}
export type AtlasErrorCodeValue = import("./constants.js").AtlasErrorCodeValue;
export type AtlasErrorSeverityValue = import("./constants.js").AtlasErrorSeverityValue;
export type ProviderId = import("./types.js").ProviderId;
export type CorrelationId = import("./types.js").CorrelationId;
/**
 * Optional metadata attached to any `AtlasError`. None of these fields
 * are load-bearing; they exist to help callers display context to users.
 */
export type AtlasErrorContext = {
    /**
     * - The provider responsible, if known.
     */
    provider?: ProviderId;
    /**
     * - Verbatim message from the provider, redacted of any secrets.
     */
    providerMessage?: string;
    /**
     * - The provider's own error code, opaque to Atlas.
     */
    providerCode?: string | number;
    correlationId?: CorrelationId;
};
