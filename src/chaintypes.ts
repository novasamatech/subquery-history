import { spec } from "@edgeware/node-types";

const RewardDestinationTo257 = {
  "_enum": ["Staked", "Stashed", "Controller"]
}

export default {
  types: {
    RewardDestinationTo257,
    Signature: '[u8; 60]',
  },
  ...spec
};
