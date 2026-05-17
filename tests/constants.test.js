// Copyright 2026 UnifyVerse B.V.
// Licensed under the Apache License, Version 2.0.

import test from 'brittle'

import {
  AtlasStatus,
  AtlasErrorCode,
  AtlasErrorSeverity,
  ApprovalKind,
  ChainNamespace,
  KnownChain,
  Optimisation,
  FeeKind,
  TransactionKind,
  ATLAS_PROTOCOL_VERSION
} from '../index.js'

const FROZEN = [
  ['AtlasStatus', AtlasStatus],
  ['AtlasErrorCode', AtlasErrorCode],
  ['AtlasErrorSeverity', AtlasErrorSeverity],
  ['ApprovalKind', ApprovalKind],
  ['ChainNamespace', ChainNamespace],
  ['KnownChain', KnownChain],
  ['Optimisation', Optimisation],
  ['FeeKind', FeeKind],
  ['TransactionKind', TransactionKind]
]

for (const [name, obj] of FROZEN) {
  test(`${name} is frozen and has only string values`, (t) => {
    t.ok(Object.isFrozen(obj), 'frozen')
    for (const v of Object.values(obj)) {
      t.is(typeof v, 'string', `value ${String(v)} is a string`)
    }
  })
}

test('AtlasStatus contains the expected closed set', (t) => {
  const values = new Set(Object.values(AtlasStatus))
  for (const required of [
    'preparing',
    'awaiting_approval',
    'awaiting_signature',
    'broadcast',
    'confirming',
    'bridging',
    'settling',
    'succeeded',
    'partially_completed',
    'failed',
    'expired',
    'cancelled'
  ]) {
    t.ok(values.has(required), `has ${required}`)
  }
})

test('AtlasErrorSeverity has exactly four axes', (t) => {
  t.alike(
    new Set(Object.values(AtlasErrorSeverity)),
    new Set(['retryable', 'investigate', 'funds_at_risk', 'provider_broken'])
  )
})

test('KnownChain values are CAIP-2 formatted', (t) => {
  for (const v of Object.values(KnownChain)) {
    t.ok(typeof v === 'string' && v.includes(':'), `${v} contains a ':'`)
    const [ns] = v.split(':')
    t.ok(Object.values(ChainNamespace).includes(ns), `namespace ${ns} is known`)
  }
})

test('ATLAS_PROTOCOL_VERSION is a semver string', (t) => {
  t.ok(/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(ATLAS_PROTOCOL_VERSION), 'matches semver shape')
})
