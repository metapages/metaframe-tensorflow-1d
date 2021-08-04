declare module 'use-hash-param';

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

// interface FunctionComponent<P = {}> {
//     (props: RenderableProps<P>, context?: any): preact.JSX.Element | null;
//     displayName?: string;
//     defaultProps?: Partial<P>;
// }
