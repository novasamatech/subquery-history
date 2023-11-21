// "Adapted from https://github.com/polkadot-js/apps/blob/master/packages/apps-config/src/api/spec/frequency.ts

import type { OverrideBundleDefinition } from "@polkadot/types/types";

import {
  rpc,
  runtime,
  signedExtensions,
  types,
} from "@frequency-chain/api-augment";

export default {
  typesBundle: {
    rpc,
    runtime,
    signedExtensions,
    types: [
      {
        // on all versions
        minmax: [0, undefined],
        types,
      },
    ],
  } as OverrideBundleDefinition,
};
