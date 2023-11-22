// "Adapted from https://github.com/polkadot-js/apps/blob/master/packages/apps-config/src/api/spec/peaq.ts

import type { OverrideBundleDefinition } from '@polkadot/types/types';

import { typesBundleForPolkadot } from '@peaqnetwork/type-definitions';

export default {
    typesBundle: (typesBundleForPolkadot as { spec: { peaq: OverrideBundleDefinition } }).spec.peaq
}