// export/publish main entry point
export type {
  PredictionInput,
  PredictionInputEncoded,
  PredictionMetadata,
  PredictionResult,
  SensorSeries,
  SensorSeriesBase64,
  TrainingDataPoint,
  TrainingDataSet,
  TrainingMetadata,
} from "./metaframe";

export type {
  PersistedModel,
  PersistedModelJson,
  PersistedModelMetadata,
} from "./types";

export { TrainingData } from "./TrainingData";

export { jsonToModel, modelToJson, predict, processPrediction } from "./io";

export { base64encode, base64decode } from "./base64";

export {
  sensorSeriesDecode,
  sensorSeriesEncode,
  predictionEncode,
  predictionDecode,
} from "./metaframe";
