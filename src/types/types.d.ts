// I don't think this works
// https://github.com/preactjs/preact/issues/2748
import React from 'react'
declare global {
    namespace React {
        interface ReactElement {
            nodeName: any
            attributes: any
            children: any
        }
    }
}
