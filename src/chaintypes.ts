import { OverrideBundleType } from '@polkadot/types/types';

const types = {
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types: {
        Record: 'Vec<u8>',
        Technics: 'Vec<u8>',
        Economics: '{}',
        Report: {
          index: 'LiabilityIndex',
          sender: 'AccountId',
          payload: 'Vec<u8>',
          signature: 'MultiSignature'
        },
        ReportFor: 'Report',
        Agreement: {
          technics: 'Technics',
          economics: 'Economics',
          promisee: 'AccountId',
          promisor: 'AccountId',
          promisee_signature: 'MultiSignature',
          promisor_signature: 'MultiSignature'
        },
        LiabilityIndex: 'u32'
      }
    }
  ]
}

const typesBundle: OverrideBundleType = {
  spec: {
    robonomics: types,
  },
}

export default {
  types: {
  },
  typesBundle
};
