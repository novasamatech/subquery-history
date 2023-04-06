import type { OverrideBundleType } from '@polkadot/types/types';

import eqDefs from '@equilab/definitions';



const { equilibrium, equilibriumNext } = eqDefs;


const typesBundle: OverrideBundleType = {
  spec: {
    "Equilibrium": {
      types: [
        {
          minmax: [0, 264],
          types: equilibrium.types
        },
        {
          minmax: [265, undefined],
          types: equilibriumNext.types
        }
      ]
    },
  },
};

export default typesBundle;