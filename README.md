# @unifyverse/atlas-core

> Atlas Core: typed abstract protocol contract for cross-chain swap and bridge routing in the Tether WDK ecosystem.

**Status:** design phase. The runtime is intentionally not implemented
yet. This package ships **types, constants, errors, and one abstract
class** (`AtlasProtocol`) — every method throws
`AtlasNotImplementedError`. Adapters live in sibling packages.

## What's here

- `AtlasProtocol` — abstract base class for any Atlas adapter
  (`quote`, `prepare`, `getStatus`).
- A complete public type system for cross-chain routes
  (`Route`, `RouteLeg`, `Quote`, `Fee`, `Approval`,
  `UnsignedTransaction`, `RouteExecution`, …).
- A closed-set status taxonomy (`AtlasStatus`) and a two-axis error
  taxonomy (`AtlasErrorCode` + `AtlasErrorSeverity`).
- A CAIP-2 `ChainRef` branded string plus a `KnownChain` starter set.
- Zero runtime dependencies for the Node entry. Bare entry
  (`bare.js`) depends only on `bare-node-runtime`.

## What's not here

- No HTTP client, no provider SDK, no aggregator adapter.
- No signing, no broadcasting, no key material.
- No JSON codec for `bigint` (see `SCHEMA.md` for the wire-format
  rule).

## Read this first

- [`SCHEMA.md`](./SCHEMA.md) — the canonical data-model narrative.
  Read this before reading any code.
- [`QUESTIONS.md`](./QUESTIONS.md) — open design questions blocking
  implementation. Resolve before building adapters.

## End-to-end usage (abbreviated)

The contract is `quote()` → `prepare()` → caller signs and broadcasts
via the WDK wallet → `getStatus()`. Atlas never signs or broadcasts.

```js
import AtlasProtocol, { KnownChain } from '@unifyverse/atlas-core'

// `AtlasProtocol` is the abstract base; use a concrete adapter in practice.
const atlas = new ConcreteAdapter(walletAccount)

const { route } = await atlas.quote({
  fromAsset: { chain: KnownChain.Ethereum, address: USDT_ETH, decimals: 6, symbol: 'USDT' },
  toAsset:   { chain: KnownChain.Arbitrum, address: USDT_ARB, decimals: 6, symbol: 'USDT' },
  amountSource: 1_000_000n,                // number | bigint accepted
  fromAddress: caller.address,
  toAddress:   caller.address,
  preferences: { slippageBps: 50, optimiseFor: 'output' }
})

const prep = await atlas.prepare(route)
for (const a of prep.approvals) {
  if (a.kind === 'noop') continue
  await walletAccount.send(a.transaction)
}
for (const leg of prep.route.legs) {
  for (const tx of leg.transactions) await walletAccount.send(tx)
}

const exec = await atlas.getStatus(prep.providerRouteId)   // poll until terminal
```

See `SCHEMA.md` § "Worked example: end-to-end swap" for the full
walkthrough.

## Building

```sh
npm install
npm run lint           # standard
npm run build:types    # tsc -> ./types/*.d.ts
npm test               # brittle
```

## License

Apache-2.0. See `LICENSE`.
