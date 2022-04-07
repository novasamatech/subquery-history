import type { OverrideBundleType } from '@polkadot/types/types';
import { versionedKhala } from '@phala/typedefs';

const typesBundle: OverrideBundleType = {
  spec: {
    khala: {
      types: versionedKhala
    },
  },
}

export default {
  typesBundle
};