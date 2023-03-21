import type { OverrideBundleType, OverrideBundleDefinition } from '@polkadot/types/types';

import { typeBundleForPolkadot } from '@zeroio/type-definitions';

const typesBundle: OverrideBundleType = {
    spec: {
        "subzero": typeBundleForPolkadot.types as unknown as OverrideBundleDefinition,
    },
};

export default {
    typesBundle,
};