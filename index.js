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

// ----- Type re-exports (JSDoc imports surface typedefs via tsc) -----

/** @typedef {import('./src/types.js').ChainRef} ChainRef */
/** @typedef {import('./src/types.js').ProviderId} ProviderId */
/** @typedef {import('./src/types.js').ProviderRouteId} ProviderRouteId */
/** @typedef {import('./src/types.js').CorrelationId} CorrelationId */
/** @typedef {import('./src/types.js').AddressString} AddressString */
/** @typedef {import('./src/types.js').TxHashString} TxHashString */
/** @typedef {import('./src/types.js').AssetRef} AssetRef */
/** @typedef {import('./src/types.js').UnixSec} UnixSec */
/** @typedef {import('./src/types.js').DurationSec} DurationSec */
/** @typedef {import('./src/types.js').AmountBase} AmountBase */
/** @typedef {import('./src/types.js').AmountInput} AmountInput */
/** @typedef {import('./src/types.js').AmountUsdMicros} AmountUsdMicros */
/** @typedef {import('./src/types.js').AtlasWalletAccountLike} AtlasWalletAccountLike */
/** @typedef {import('./src/types.js').BasisPoints} BasisPoints */
/** @typedef {import('./src/types.js').Fee} Fee */
/** @typedef {import('./src/types.js').Approval} Approval */
/** @typedef {import('./src/types.js').UnsignedTransaction} UnsignedTransaction */
/** @typedef {import('./src/types.js').EvmUnsignedTx} EvmUnsignedTx */
/** @typedef {import('./src/types.js').SolanaUnsignedTx} SolanaUnsignedTx */
/** @typedef {import('./src/types.js').TonUnsignedTx} TonUnsignedTx */
/** @typedef {import('./src/types.js').TronUnsignedTx} TronUnsignedTx */
/** @typedef {import('./src/types.js').TransferUnsignedTx} TransferUnsignedTx */
/** @typedef {import('./src/types.js').RouteLeg} RouteLeg */
/** @typedef {import('./src/types.js').Route} Route */
/** @typedef {import('./src/types.js').Quote} Quote */
/** @typedef {import('./src/types.js').PreferencesInput} PreferencesInput */
/** @typedef {import('./src/types.js').QuoteInput} QuoteInput */
/** @typedef {import('./src/types.js').RoutePreparation} RoutePreparation */
/** @typedef {import('./src/types.js').LegExecutionRecord} LegExecutionRecord */
/** @typedef {import('./src/types.js').RouteExecution} RouteExecution */
/** @typedef {import('./src/types.js').AtlasLogger} AtlasLogger */

/** @typedef {import('./src/config.js').ChainConfig} ChainConfig */
/** @typedef {import('./src/config.js').ProviderConfig} ProviderConfig */
/** @typedef {import('./src/config.js').AtlasProtocolConfig} AtlasProtocolConfig */

// ----- Value exports -----

export { default, AtlasProtocol } from './src/atlas-protocol.js'

export {
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
} from './src/constants.js'

export {
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
} from './src/errors.js'
