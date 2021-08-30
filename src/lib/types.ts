// example:
// {
//     "training": {
//         "data": [
//             {
//                 "name": "some identifier, can be timestamp",
//                 "label": "label1",
//                 "dimensions": [x, y],
//                 "encoding": "base64",
//                 "data": "dsfsdfsdf"
//             },
//             {
//                 "label": "label2",
//                 "dimensions": [x, y],
//                 "encoding": "base64",
//                 "url": "https://where.is.my.data/xzy"
//             },
//             {
//                 "label": "label1",
//                 "name": "some identifier, can be timestamp",
//                 "dimensions": [x, y],
//                 "encoding": "json",
//                 "data": [ [1,2,3], [1,2,3] ]
//             },
//         ]
//     }
// }
import * as tf from "@tensorflow/tfjs";
import { TrainingMetadata, PredictionMetadata } from "./metaframe";

export interface PersistedModelMetadata {
  // user supplied id, for tracking training, models, and predictions
  modelId?: string;
  prediction: PredictionMetadata;
  training: TrainingMetadata;
}

export interface PersistedModel {
  type: "PersistedModel.v1" | "PersistedModelJson.v1";
  model: tf.LayersModel;
  meta: PersistedModelMetadata;
}

export interface PersistedModelJson extends Omit<PersistedModel, "model"> {
  type: "PersistedModel.v1" | "PersistedModelJson.v1";
  version?: number; // not currently used, but best to start with a plan for versioning
  model: any;
}
