// export/publish main entry point
export {
    TrainingData,
} from "./TrainingData";

export {
    jsonToModel,
    modelToJson,
} from "./io";

export {
    IMUSensorGesture2,
    convertIMUSensorGesture2ToIMUSensorExample,
    IMUData,
} from "./IMUData";

export {
    base64encode,
    base64decode,
} from "./base64";


export {
    PredictionInput,
    PredictionInputEncoded,
    PredictionMetadata,
    PredictionResult,
    SensorSeries,
    SensorSeriesBase64,
    sensorSeriesDecode,
    sensorSeriesEncode,
    TrainingDataPoint,
    TrainingDataSet,
    TrainingMetadata,
} from "./metaframe";
