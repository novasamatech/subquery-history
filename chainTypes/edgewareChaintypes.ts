import { spec } from "@edgeware/node-types";

const RewardDestinationTo257 = {
  _enum: {
    Staked: "Null",
    Stash: "Null",
    Controller: "Null",
  },
};

const Event = {
  _enum: {
    index:"EventId",
    data:"Null"
  }
}
export default {
  types: {
    ValidatorPrefs: {
      commission: "Compact<Perbill>",
    },
    RewardDestinationTo257,
    Signature: "[u8; 60]",
    Event: Event
  },
  ...spec,
};