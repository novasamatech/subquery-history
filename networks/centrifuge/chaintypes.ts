import { OverrideBundleType } from '@polkadot/types/types';

export default {
  typesBundle: {
    spec: {
      'centrifuge': {
        types: [
          {
            // on all versions
            minmax: [0, undefined],
            types: {
              ParachainAccountIdOf: 'AccountId',
              Proof: {
                leafHash: 'Hash',
                sortedHashes: 'Vec<Hash>'
              },
              ProxyType: {
                _enum: [
                  'Any',
                  'NonTransfer',
                  'Governance',
                  '_Staking',
                  'NonProxy'
                ]
              },
              RelayChainAccountId: 'AccountId',
              RootHashOf: 'Hash'
            }
          }
        ]
      }
    }
  }
};