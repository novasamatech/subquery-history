import { acalaTypesBundle as typesBundle } from "@acala-network/types";

// Need to make a copy in order to override
const overrideTypesBundle = {
  ...typesBundle,
};
overrideTypesBundle.spec.karura.types.push({
  minmax: [0, undefined],
  types: {
    AuthorityOrigin: "DelayedOrigin",
    DelayedOrigin: {
      delay: "BlockNumber",
      origin: "PalletsOrigin",
    },
    ScheduleTaskIndex: "u32",
  },
});

export default {
  typesBundle: overrideTypesBundle,
};
