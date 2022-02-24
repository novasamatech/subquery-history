import { OverrideBundleType } from '@polkadot/types/types';

const types = {
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types: {
      }
    }
  ]
}

const typesBundle: OverrideBundleType = {
  spec: {
    picasso: types,
  },
}

export default {
  types: {
  },
  typesBundle
};
