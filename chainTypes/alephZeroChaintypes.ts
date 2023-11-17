// Copyright 2017-2023 @polkadot/types-known authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable sort-keys */

import type { OverrideBundleDefinition } from "@polkadot/types/types";

// structs need to be in order
/* eslint-disable sort-keys */

const definitions: OverrideBundleDefinition = {
  types: [
    {
      minmax: [3, undefined],
      types: {
        DispatchErrorModule: "DispatchErrorModuleU8",
      },
    },
  ],
};

export default { typesBundle: { spec: { "aleph-node": definitions } } };
