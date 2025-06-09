import { OverrideBundleType } from "@polkadot/types/types";

export default {
  typesBundle: {
    spec: {
      centrifuge: {
        types: [
          {
            // on all versions
            minmax: [0, undefined],
            types: {
              AnchorData: {
                id: "Hash",
                docRoot: "Hash",
                anchoredBlock: "u64",
              },
              ChainId: "u8",
              "chainbridge::ChainId": "u8",
              DepositNonce: "u64",
              Fee: {
                key: "Hash",
                price: "Balance",
              },
              ParachainAccountIdOf: "AccountId",
              PreCommitData: {
                signingRoot: "Hash",
                identity: "AccountId",
                expirationBlock: "u64",
              },
              Proof: {
                leafHash: "Hash",
                sortedHashes: "Vec<Hash>",
              },
              ProxyType: {
                _enum: [
                  "Any",
                  "NonTransfer",
                  "Governance",
                  "_Staking",
                  "NonProxy",
                ],
              },
              ResourceId: "[u8; 32]",
              RelayChainAccountId: "AccountId",
              RootHashOf: "Hash",
            },
          },
        ],
      },
    },
  },
};
