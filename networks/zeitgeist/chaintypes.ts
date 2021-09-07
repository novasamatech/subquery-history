import { OverrideBundleType } from '@polkadot/types/types';
import * as typeDefs from '@zeitgeistpm/type-defs';

function typesFromDefs (definitions: Record<string, { types: Record<string, any> }>): Record<string, any> {
  return Object
    .values(definitions)
    .reduce((res: Record<string, any>, { types }): Record<string, any> => ({
      ...res,
      ...types
    }), {});
}

const types = {
  alias: {
    tokens: {
      AccountData: 'TokensAccountData'
    }
  },
  types: [{
    minmax: [0, undefined],
    types: {
      ...typesFromDefs(typeDefs),
      TokensAccountData: {
        free: 'Balance',
        frozen: 'Balance',
        reserved: 'Balance'
      }
    }
  }]
}

const typesBundle: OverrideBundleType = {
  spec: {
    zeitgeist: types,
  },
}

export default {
  types: {
  },
  typesBundle
};