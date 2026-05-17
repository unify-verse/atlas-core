// Copyright 2026 UnifyVerse B.V.
// Licensed under the Apache License, Version 2.0.

import test from 'brittle'

import {
  AtlasProtocol,
  AtlasError,
  AtlasNotImplementedError,
  AtlasErrorCode,
  AtlasErrorSeverity
} from '../index.js'

test('AtlasProtocol.quote throws AtlasNotImplementedError', async (t) => {
  const protocol = new AtlasProtocol(null)

  await t.exception(() => protocol.quote(/** @type {any} */ ({})), /not implemented|abstract/i)

  try {
    await protocol.quote(/** @type {any} */ ({}))
    t.fail('expected throw')
  } catch (err) {
    t.ok(err instanceof AtlasNotImplementedError, 'is AtlasNotImplementedError')
    t.ok(err instanceof AtlasError, 'is AtlasError')
    t.is(err.code, AtlasErrorCode.NotImplemented)
    t.is(err.severity, AtlasErrorSeverity.Investigate)
  }
})

test('AtlasProtocol.prepare throws AtlasNotImplementedError', async (t) => {
  const protocol = new AtlasProtocol(null)

  try {
    await protocol.prepare(/** @type {any} */ ({}))
    t.fail('expected throw')
  } catch (err) {
    t.ok(err instanceof AtlasNotImplementedError, 'is AtlasNotImplementedError')
    t.is(err.code, AtlasErrorCode.NotImplemented)
  }
})

test('AtlasProtocol.getStatus throws AtlasNotImplementedError', async (t) => {
  const protocol = new AtlasProtocol(null)

  try {
    await protocol.getStatus(/** @type {any} */ ('opaque-id'))
    t.fail('expected throw')
  } catch (err) {
    t.ok(err instanceof AtlasNotImplementedError, 'is AtlasNotImplementedError')
    t.is(err.code, AtlasErrorCode.NotImplemented)
  }
})

test('AtlasProtocol exposes the injected account and config to subclasses', (t) => {
  class Probe extends AtlasProtocol {
    inspect () {
      return { account: this._account, config: this._config }
    }
  }

  const account = { kind: 'mock' }
  const config = { defaultQuoteTtlSec: /** @type {any} */ (30) }
  const probe = new Probe(account, config)

  const got = probe.inspect()
  t.is(got.account, account)
  t.is(got.config, config)
})
