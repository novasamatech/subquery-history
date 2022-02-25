import { OverrideBundleType } from '@polkadot/types/types';
import definitions from '@subsocial/types/substrate/interfaces/subsocial/definitions';

export default {
  typesBundle: {
    spec: {
      'subsocial-parachain': {
        types: definitions
      }
    }
  }
};
