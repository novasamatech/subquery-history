import { spec } from "@edgeware/node-types";

const RewardDestinationTo257 = {
  _enum: {
    Staked: "Null",
    Stash: "Null",
    Controller: "Null",
  },
};

export default {
  types: {
    ValidatorPrefs: {
      commission: "Compact<Perbill>",
    },
    RewardDestinationTo257,
    Signature: "[u8; 60]",
  },
  ...spec,
};