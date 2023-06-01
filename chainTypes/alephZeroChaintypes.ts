// Copyright 2017-2023 @polkadot/types-known authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable sort-keys */

import {OverrideBundleDefinition} from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
    types: [
        {
            minmax: [0, 4],
            types: {
                DispatchError: 'DispatchErrorPre6First',
            }
        },
    ]
};

export default { typesBundle: { spec: { "aleph-node" : definitions }}};