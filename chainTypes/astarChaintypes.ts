// Copyright 2017-2023 @polkadot/types-known authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { OverrideBundleDefinition } from "@polkadot/types/types";

// structs need to be in order
/* eslint-disable sort-keys */

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // on all versions
      minmax: [0, undefined],
      types: {
        Keys: "AccountId",
        Address: "MultiAddress",
        LookupSource: "MultiAddress",
        AmountOf: "Amount",
        Amount: "i128",
        SmartContract: {
          _enum: {
            Evm: "H160",
            Wasm: "AccountId",
          },
        },
        EraStakingPoints: {
          total: "Balance",
          stakers: "BTreeMap<AccountId, Balance>",
          formerStakedEra: "EraIndex",
          claimedRewards: "Balance",
        },
        PalletDappsStakingEraStakingPoints: {
          total: "Balance",
          stakers: "BTreeMap<AccountId, Balance>",
          formerStakedEra: "EraIndex",
          claimedRewards: "Balance",
        },
        EraRewardAndStake: {
          rewards: "Balance",
          staked: "Balance",
        },
        PalletDappsStakingEraRewardAndStake: {
          rewards: "Balance",
          staked: "Balance",
        },
        EraIndex: "u32",
        // TODO awaiting an error at a future spec version to figure out the end range [3,undefined]
        DispatchErrorModule: {
          index: "u8",
          error: "u8",
        },
      },
    },
    {
      minmax: [14, undefined],
      types: {
        EthTransaction: "LegacyTransaction",
      },
    },
  ],
};

export default { typesBundle: { spec: { shiden: definitions } } };
