// Copyright 2026 UnifyVerse B.V.
// Licensed under the Apache License, Version 2.0.

import test from 'brittle'

import {
  AtlasError,
  AtlasInvalidInputError,
  AtlasUnsupportedRouteError,
  AtlasChainUnsupportedError,
  AtlasProviderError,
  AtlasProviderUnavailableError,
  AtlasQuoteExpiredError,
  AtlasReadOnlyAccountError,
  AtlasFeeCapExceededError,
  AtlasSlippageExceededError,
  AtlasInsufficientBalanceError,
  AtlasInsufficientAllowanceError,
  AtlasFundsAtRiskError,
  AtlasNotImplementedError,
  AtlasErrorCode,
  AtlasErrorSeverity
} from '../index.js'

const CASES = [
  [AtlasInvalidInputError, AtlasErrorCode.InvalidInput, AtlasErrorSeverity.Investigate],
  [AtlasUnsupportedRouteError, AtlasErrorCode.UnsupportedRoute, AtlasErrorSeverity.Investigate],
  [AtlasChainUnsupportedError, AtlasErrorCode.ChainUnsupported, AtlasErrorSeverity.Investigate],
  [AtlasProviderError, AtlasErrorCode.ProviderError, AtlasErrorSeverity.ProviderBroken],
  [AtlasProviderUnavailableError, AtlasErrorCode.ProviderUnavailable, AtlasErrorSeverity.Retryable],
  [AtlasQuoteExpiredError, AtlasErrorCode.QuoteExpired, AtlasErrorSeverity.Retryable],
  [AtlasReadOnlyAccountError, AtlasErrorCode.ReadOnlyAccount, AtlasErrorSeverity.Investigate],
  [AtlasFeeCapExceededError, AtlasErrorCode.FeeCapExceeded, AtlasErrorSeverity.Investigate],
  [AtlasSlippageExceededError, AtlasErrorCode.SlippageExceeded, AtlasErrorSeverity.FundsAtRisk],
  [AtlasInsufficientBalanceError, AtlasErrorCode.InsufficientBalance, AtlasErrorSeverity.Investigate],
  [AtlasInsufficientAllowanceError, AtlasErrorCode.InsufficientAllowance, AtlasErrorSeverity.Investigate],
  [AtlasFundsAtRiskError, AtlasErrorCode.FundsAtRisk, AtlasErrorSeverity.FundsAtRisk]
]

for (const [Cls, code, severity] of CASES) {
  test(`${Cls.name} carries the expected code and severity`, (t) => {
    const err = new Cls('boom')
    t.ok(err instanceof AtlasError, 'extends AtlasError')
    t.is(err.code, code)
    t.is(err.severity, severity)
    t.is(err.name, Cls.name)
    t.is(err.message, 'boom')
  })
}

test('AtlasNotImplementedError formats the method name', (t) => {
  const err = new AtlasNotImplementedError('quote')
  t.ok(err instanceof AtlasError)
  t.is(err.code, AtlasErrorCode.NotImplemented)
  t.is(err.severity, AtlasErrorSeverity.Investigate)
  t.ok(/AtlasProtocol\.quote\(\)/.test(err.message))
})

test('AtlasError preserves cause via Error.cause', (t) => {
  const root = new Error('root cause')
  const err = new AtlasInvalidInputError('wrapped', undefined, root)
  t.is(err.cause, root)
})
