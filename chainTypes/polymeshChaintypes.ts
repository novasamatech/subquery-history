import type { OverrideBundleDefinition } from '@polkadot/types/types';

import schema from '@polymathnetwork/polymesh-types';

const definitions: OverrideBundleDefinition = {
  rpc: schema.rpc,
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types: schema.types
    }
  ]
};

export default { typesBundle: { spec: { polymesh: definitions }}};