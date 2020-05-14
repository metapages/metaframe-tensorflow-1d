/** 
 * Load and save tensorflow js models to JSON
 * 
 * const modelJson = '{ ... }';
 * const handlerLoader = new JsonIOHandler(modelJson);
 * const model = await tf.loadLayersModel(handlerLoader);
 * 
 * const handlerSaver = new JsonIOHandler();
 * const saveResult = model.save(handlerSaver);
 * const savedModelJson = handlerSaver.modelJson;
 */

import * as tf from '@tensorflow/tfjs';
import { base64ArrayBuffer, Base64Binary} from './io';

export class JsonIOHandler implements tf.io.IOHandler {

    modelJson: any;
    constructor(input ?:any) {
        this.modelJson = input;
    }

    async save(modelArtifact: tf.io.ModelArtifacts): Promise<tf.io.SaveResult> {
        const saveResult :tf.io.SaveResult = {
            modelArtifactsInfo: {
                dateSaved: new Date(),
                modelTopologyType: 'JSON',
                modelTopologyBytes: (modelArtifact.modelTopology as ArrayBuffer).byteLength,
                // weightSpecsBytes: unknown,
                weightDataBytes: (modelArtifact.weightData as ArrayBuffer).byteLength,
            },
        }
        try {
            this.modelJson = Object.assign({}, modelArtifact);
            this.modelJson.modelTopology = base64ArrayBuffer(modelArtifact.modelTopology as ArrayBuffer);
            this.modelJson.weightData = base64ArrayBuffer(modelArtifact.weightData as ArrayBuffer);
            return saveResult;
        } catch(err) {
            saveResult.errors = [`{err}`];
            return saveResult;
        }
    }
    async load () : Promise<tf.io.ModelArtifacts> {
        console.log('JsonIOHandler.loading')
        const modelArtifacts :tf.io.ModelArtifacts = Object.assign({}, this.modelJson);
        modelArtifacts.modelTopology = Base64Binary.decode(this.modelJson.modelTopology as string).buffer;
        modelArtifacts.weightData = Base64Binary.decode(this.modelJson.weightData as string).buffer;
        console.log('JsonIOHandler.modelArtifacts', modelArtifacts)
        return modelArtifacts;
    }
}

// export interface SaveResult {
//     /**
//      * Information about the model artifacts saved.
//      */
//     modelArtifactsInfo: ModelArtifactsInfo;
//     /**
//      * HTTP responses from the server that handled the model-saving request (if
//      * any). This is applicable only to server-based saving routes.
//      */
//     responses?: Response[];
//     /**
//      * Error messages and related data (if any).
//      */
//     errors?: Array<{} | string>;
// }


// export declare interface ModelArtifactsInfo {
//     /**
//      * Timestamp for when the model is saved.
//      */
//     dateSaved: Date;
//     /**
//      * TODO (cais,yassogba) consider removing GraphDef as GraphDefs now
//      * come in a JSON format and none of our IOHandlers support a non json
//      * format. We could conder replacing this with 'Binary' if we want to
//      * allow future handlers to save to non json formats (though they will
//      * probably want more information than 'Binary').
//      * Type of the model topology
//      *
//      * Type of the model topology
//      *
//      * Possible values:
//      *   - JSON: JSON config (human-readable, e.g., Keras JSON).
//      *   - GraphDef: TensorFlow
//      *     [GraphDef](https://www.tensorflow.org/extend/tool_developers/#graphdef)
//      *     protocol buffer (binary).
//      */
//     modelTopologyType: 'JSON' | 'GraphDef';
//     /**
//      * Size of model topology (Keras JSON or GraphDef), in bytes.
//      */
//     modelTopologyBytes?: number;
//     /**
//      * Size of weight specification or manifest, in bytes.
//      */
//     weightSpecsBytes?: number;
//     /**
//      * Size of weight value data, in bytes.
//      */
//     weightDataBytes?: number;
// }
