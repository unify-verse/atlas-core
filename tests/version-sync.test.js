// Copyright 2026 UnifyVerse B.V.
// Licensed under the Apache License, Version 2.0.

import test from 'brittle'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { ATLAS_PROTOCOL_VERSION } from '../index.js'

const here = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(here, '..', 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

test('ATLAS_PROTOCOL_VERSION matches package.json version exactly', (t) => {
  t.is(
    ATLAS_PROTOCOL_VERSION,
    pkg.version,
    `ATLAS_PROTOCOL_VERSION (${ATLAS_PROTOCOL_VERSION}) must equal package.json version (${pkg.version})`
  )
})
