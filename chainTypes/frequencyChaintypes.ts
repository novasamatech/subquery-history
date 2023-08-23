import type { OverrideBundleDefinition } from '@polkadot/types/types';

import { rpc, runtime, signedExtensions, types } from '@frequency-chain/api-augment';

export default {
  rpc,
  runtime,
  signedExtensions,
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types
    }
  ]
} as OverrideBundleDefinition;