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
import * as tf from '@tensorflow/tfjs';
import {IMUSensorJson, IMUSensorExample} from './IMUData';

export type Base64String = string;

export interface PredictionInput {
    data: IMUSensorJson|IMUSensorExample;
    requestId :string|number;
}

/**
 * This is the output from an input prection
 * prediction: the class name of the prediction
 * predictions: map of class names to score
 */
export interface PredictionResult {
    prediction : string;
    predictions: {[className:string]:number};
    requestId  : string|number;
    modelHash  : string;
    modelId   ?: string;
}

export interface TrainingDataPoint {
    version?: string; // TODO: solve versioning since this is a blob to the graphql API
    name?: string;
    label: string;
    encoding?: 'json' | 'base64'
    url?: string;
    data: string; // JSON transfer uses Base64String
}

export interface TrainingDataSet {
    // stored with the model, for bookkeeping
    modelId ?: string;
    examples : Array<TrainingDataPoint>;
}

export interface PredictionMetadata {
    classNames: string[];
    imageHeight: number;
    imageWidth: number;
    maxAbsoluteRawValue :number;
  }
  
  export interface TrainingMetadata {
    date: Date;
    trainingDataHash: string;
  }
  
export interface PersistedModelMetadata {
    // user supplied id, for tracking training, models, and predictions
    modelId ?:string;
    prediction: PredictionMetadata;
    training: TrainingMetadata;
}

export interface PersistedModel {
    model :tf.LayersModel;
    meta: PersistedModelMetadata;
}

export interface PersistedModelJson extends Omit<PersistedModel, 'model'>{
    version ?:number;// not currently used, but best to start with a plan for versioning
    model    :any;
}
