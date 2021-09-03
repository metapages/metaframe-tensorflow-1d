import * as tf from "@tensorflow/tfjs";
import { ModelArtifactsEncoded, PersistedModel, PersistedModelJson } from "./types";
import { encode, decode } from "base64-arraybuffer";
import { SensorSeries, PredictionInput, PredictionResult } from "./metaframe";

/**
 * Load and save tensorflow js models to JSON
 * Reference: https://github.com/tensorflow/tfjs/blob/tfjs-v1.7.0/tfjs-core/src/io/http.ts
 *
 * const modelJson = '{ ... }';
 * const handlerLoader = new JsonIOHandler(modelJson);
 * const model = await tf.loadLayersModel(handlerLoader);
 *
 * const handlerSaver = new JsonIOHandler();
 * const saveResult = model.save(handlerSaver);
 * const savedModelJson = handlerSaver.modelJson;
 */

 export const modelToJson = async (
  m: PersistedModel
): Promise<PersistedModelJson> => {
  if (m.type !== "PersistedModel.v1") {
    throw `modelToJson expecting PersistedModel.v1 but got ${m.type}`;
  }

  const handlerSaver = new JsonIOHandler();
  const saveResult = await m.model.save(handlerSaver);

  if (!handlerSaver.modelEncoded) {
    throw "JsonIOHandler did not provide .modelEncoded";
  }

  const persistedModelJson: PersistedModelJson = {
    type: "PersistedModelJson.v1",
    model: handlerSaver.modelEncoded!,
    meta: m.meta,
  }

  return persistedModelJson;
};

export const jsonToModel = async (
  m: PersistedModelJson
): Promise<PersistedModel> => {
  if (m.type !== "PersistedModelJson.v1") {
    throw `🔰 modelToJson expecting PersistedModelJson.v1 but got ${m.type}`;
  }
  const handlerLoader = new JsonIOHandler(m.model);
  const loadedModel = await tf.loadLayersModel(handlerLoader);
  const persistedModel: PersistedModel = {
    type: "PersistedModel.v1",
    model: loadedModel,
    meta: m.meta,
  }
  return persistedModel;
};

class JsonIOHandler implements tf.io.IOHandler {
  model: tf.io.ModelArtifacts | undefined;
  modelEncoded: ModelArtifactsEncoded | undefined;
  constructor(input?: ModelArtifactsEncoded) {
    this.modelEncoded = input;
  }

  // convertedBy: null
  // format: "layers-model"
  // generatedBy: "TensorFlow.js tfjs-layers v1.7.4"
  // modelTopology: ArrayBuffer(0)
  // weightData: ArrayBuffer(860420)
  // weightSpecs: Array(10)
  //    0: {name: "conv1d_Conv1D1/kernel", shape: Array(3), dtype: "float32"}
  //    ...

  async save(modelArtifacts: tf.io.ModelArtifacts): Promise<tf.io.SaveResult> {
    if (!modelArtifacts.modelTopology) {
      throw "no modelArtifact.modelTopology";
    }
    if (!modelArtifacts.weightData) {
      throw "no modelArtifacts.weightData";
    }

    const weightsManifest: tf.io.WeightsManifestConfig = [{
      paths: ['./model.weights.bin'], //this is copied and meaningless here what whatev
      weights: modelArtifacts.weightSpecs || [],
    }];
    const modelTopologyAndWeightManifest: tf.io.ModelJSON = {
      modelTopology: modelArtifacts.modelTopology,
      format: modelArtifacts.format,
      generatedBy: modelArtifacts.generatedBy,
      convertedBy: modelArtifacts.convertedBy,
      userDefinedMetadata: modelArtifacts.userDefinedMetadata,
      weightsManifest
    };

    this.modelEncoded = {
      modelTopologyAndWeightManifest,
      weightData: encode(modelArtifacts.weightData),
    }

    const saveResult: tf.io.SaveResult = {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: "JSON",
        modelTopologyBytes: (modelArtifacts.modelTopology as ArrayBuffer)
          .byteLength,
        weightDataBytes: (modelArtifacts.weightData as ArrayBuffer).byteLength,
      },
    };

    return saveResult;
  }
  async load(): Promise<tf.io.ModelArtifacts> {

    if (!this.modelEncoded) {
      throw "Missing constructor argument";
    }

    const modelConfig = this.modelEncoded.modelTopologyAndWeightManifest;

    const modelTopology = modelConfig.modelTopology;
    const weightsManifest = modelConfig.weightsManifest;
    const generatedBy = modelConfig.generatedBy;
    const convertedBy = modelConfig.convertedBy;
    const format = modelConfig.format;
    const userDefinedMetadata = modelConfig.userDefinedMetadata;

    // We do not allow both modelTopology and weightsManifest to be missing.
    if (modelTopology == null && weightsManifest == null) {
      throw new Error(
          `The JSON contains neither model ` +
          `topology or manifest for weights.`);
    }

    let weightSpecs: tf.io.WeightsManifestEntry[] = this.modelEncoded.modelTopologyAndWeightManifest.weightsManifest[0].weights;
    const weightData: ArrayBuffer = decode(this.modelEncoded.weightData);

    return {
      modelTopology,
      weightSpecs,
      weightData,
      userDefinedMetadata,
      generatedBy,
      convertedBy,
      format
    };
  }
}

export const predict = (
  model: PersistedModel,
  input: PredictionInput
): [PredictionResult | undefined, Error | undefined] => {
  if (!model) {
    return [
      undefined,
      new Error("Asked to predict sample but no model loaded"),
    ];
  }
  if (!input) {
    return [undefined, new Error("Asked to predict but no input")];
  }

  if (!input.series) {
    return [
      undefined,
      new Error("Asked to predict but input lacks 'series' field"),
    ];
  }

  const sampleFloatArrays: SensorSeries = input.series;
  const processedSample = processPrediction(model, sampleFloatArrays);
  const xs = tf.tensor3d(processedSample, [
    1,
    model.meta.prediction.imageHeight,
    model.meta.prediction.imageWidth,
  ]);
  const prediction = (
    model.model.predictOnBatch(xs) as tf.Tensor<tf.Rank>
  ).dataSync();

  let highest: number = 0;
  let labelWithHighestScore: string = "";
  let note: string | undefined;
  const predictionMap: {
    [key: string]: number;
  } = {};

  model.meta.prediction.classNames.forEach((value: string, index: number) => {
    predictionMap[value] = prediction[index] as number;
    if (prediction[index] > highest) {
      highest = prediction[index];
      labelWithHighestScore = value;
    }
  });

  if (
    labelWithHighestScore !== "_" &&
    predictionMap[labelWithHighestScore] < 0.45 &&
    predictionMap["_"]
  ) {
    note = `${labelWithHighestScore} -> _ because score < 0.45`;
    labelWithHighestScore = "_";
  }

  const predictionJson: PredictionResult = {
    prediction: labelWithHighestScore,
    predictions: predictionMap,
    requestId: input.requestId,
    modelHash: model.meta.training.hash,
    note,
  };

  return [predictionJson, undefined];
};

export const processPrediction = (
  model: PersistedModel,
  example: SensorSeries
): Float32Array => {
  if (!example) {
    throw "processExample: missing example";
  }
  if (!model) {
    throw "processExample: missing model";
  }

  // remove the time arrays, they aren't really adding much I think
  Object.keys(example).forEach((stream: string) => {
    if (stream.endsWith("t")) {
      delete example[stream];
    }
  });

  const keys = Object.keys(example);
  keys.sort();

  // TODO this is a hack, won't always work, but I can't remember right now
  const timesteps = Math.max(
    model.meta.prediction.imageHeight,
    model.meta.prediction.imageWidth
  );

  // trim/extend so same timeSteps
  keys.forEach((stream) => {
    if (example?.[stream]?.length > timesteps) {
      example[stream] = example[stream].slice(0, timesteps);
    }
    // ensure length == timeSteps
    if (example?.[stream]?.length < timesteps) {
      const next = new Float32Array(timesteps);
      next.set(example[stream]);
      example[stream] = next;
    }
  });

  // normalize over max over all training examples
  keys.forEach((stream: string) => {
    example[stream].forEach(
      (val: number, index: number, arr: Float32Array | Int32Array) => {
        arr[index] = val / model!.meta.training.ranges[stream].absmax;
      }
    );
  });

  // put all data in a big array
  // TODO can we just create the tensor3d here would it be faster?
  const dataArray = new Float32Array(
    1 * model.meta.prediction.imageWidth * model.meta.prediction.imageHeight
  );
  keys.forEach((stream, streamIndex) => {
    const offset: number = streamIndex * timesteps;
    dataArray.set(example[stream], offset);
  });

  return dataArray;
};
