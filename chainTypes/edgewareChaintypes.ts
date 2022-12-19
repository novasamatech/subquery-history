import { spec as spec_types } from "@edgeware/node-types";

const RewardDestinationTo257 = {
  _enum: {
    Staked: "Null",
    Stash: "Null",
    Controller: "Null",
  },
};

spec_types.typesBundle.spec.edgeware.types?.push(
  {
    minmax: [0, undefined],
    types: {
      ValidatorPrefs: {
        commission: "Compact<Perbill>",
      },
      RewardDestinationTo257,
      Signature: "[u8; 60]",
      Event: ""
    },
  })

export default {...spec_types};