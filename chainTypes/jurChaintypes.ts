// Adapted from https://github.com/polkadot-js/apps/blob/master/packages/apps-config/src/api/spec/jur.ts

import type { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types: {},
    },
  ],
};

export default { typesBundle: { spec: { jur: definitions } } };
