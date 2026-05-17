// Copyright 2026 UnifyVerse B.V.
// Licensed under the Apache License, Version 2.0.

import test from 'brittle'

import {
  AtlasErrorCode,
  AtlasErrorSeverity,
  ChainNamespace,
  KnownChain,
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
  AtlasNotImplementedError
} from '../index.js'

// Build the inverse map: { [AtlasErrorCode value]: [error classes that carry this code] }.
// Excludes `NOT_IMPLEMENTED` (internal-only — only thrown by the abstract base).
const ERROR_CLASSES = [
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
  AtlasFundsAtRiskError
]

test('every AtlasErrorCode (except NOT_IMPLEMENTED) maps to at least one exported error class', (t) => {
  const codeToClasses = new Map()
  for (const Cls of ERROR_CLASSES) {
    const inst = new Cls('probe')
    const list = codeToClasses.get(inst.code) ?? []
    list.push(Cls.name)
    codeToClasses.set(inst.code, list)
  }

  for (const codeValue of Object.values(AtlasErrorCode)) {
    if (codeValue === AtlasErrorCode.NotImplemented) continue
    const classes = codeToClasses.get(codeValue) ?? []
    t.ok(classes.length >= 1, `AtlasErrorCode ${codeValue} is covered by at least one error class (covered by: ${classes.join(', ') || 'none'})`)
  }

  // Sanity: NotImplemented IS still surfaced, via the dedicated class.
  const ni = new AtlasNotImplementedError('quote')
  t.is(ni.code, AtlasErrorCode.NotImplemented, 'AtlasNotImplementedError carries NOT_IMPLEMENTED code')
})

test('KnownChain namespaces are a subset of ChainNamespace values', (t) => {
  const allowedNamespaces = new Set(Object.values(ChainNamespace))
  for (const chainRef of Object.values(KnownChain)) {
    const ns = chainRef.split(':')[0]
    t.ok(allowedNamespaces.has(ns), `KnownChain ${chainRef} namespace ${ns} is in ChainNamespace`)
  }
})

test('AtlasError can be instantiated directly with all required fields', (t) => {
  const err = new AtlasError({
    message: 'direct construction',
    code: AtlasErrorCode.InvalidInput,
    severity: AtlasErrorSeverity.Investigate
  })

  t.ok(err instanceof Error, 'extends Error')
  t.ok(err instanceof AtlasError, 'is AtlasError')
  t.is(err.message, 'direct construction')
  t.is(err.code, AtlasErrorCode.InvalidInput)
  t.is(err.severity, AtlasErrorSeverity.Investigate)
  t.is(err.name, 'AtlasError')
  t.is(err.context, undefined, 'context optional')
  t.is(err.cause, undefined, 'cause optional')
})

test('AtlasError preserves context and cause when supplied', (t) => {
  const root = new Error('root')
  const err = new AtlasError({
    message: 'with extras',
    code: AtlasErrorCode.ProviderError,
    severity: AtlasErrorSeverity.ProviderBroken,
    context: { provider: /** @type {any} */ ('rango'), providerCode: 503 },
    cause: root
  })

  t.is(err.context?.provider, 'rango')
  t.is(err.context?.providerCode, 503)
  t.is(err.cause, root)
})
