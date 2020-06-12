import {Metaframe, isIframe} from "metaframe";
import * as tf from "@tensorflow/tfjs";
import {Rank} from "@tensorflow/tfjs";
import {TrainingData} from "./TrainingData";
import {
  predictionDecode,
  PredictionInput,
  PredictionInputEncoded,
  PredictionResult,
  SensorSeries,
  SensorSeriesBase64,
  sensorSeriesDecode,
  TrainingDataSet,
} from "./metaframe";
import {PersistedModel, PersistedModelJson, PersistedModelMetadata} from "./types.d";
import {Trainer} from "./Trainer";
import {jsonToModel, modelToJson} from "./io";

// console.log('objectHash', objectHash);

const id: string = window.location.hash
  ? `-${window.location.hash.substr(1)}`
  : "-";
// const modelId = `model${id}`;
const metaframe = new Metaframe();

const urlParams = new URLSearchParams(window.location.search);
const nocache = urlParams.get("nocache") === "true" || urlParams.get("nocache") === "1";

// if (!nocache) {
//   document.getElementById('cache')!.innerHTML = 'caching enabled';
// }

// if currently computing, don't start another training until after
let hashTrainingDataCurrentlyComputing: string | undefined = undefined;

let model: PersistedModel | undefined = undefined;

// const saveModel = async (m :PersistedModel, modelKey :string) :Promise<void> => {

//     const handlerSaver = new JsonIOHandler();
//     const saveResult = m.model.save(handlerSaver);
//     const savedModelJson = handlerSaver.modelJson;

//     await m.model.save(`indexeddb://${modelKey}`);
//     return;
//      await m.model.save(`localstorage://${modelKey}`);
//      console.log('keys', localStorage.key);

//      const model_metadata = localStorage.getItem(`tensorflowjs_models/${modelKey}/model_metadata`)!;
//      const weight_data = localStorage.getItem(`tensorflowjs_models/${modelKey}/weight_data`)!;
//      const weight_specs = localStorage.getItem(`tensorflowjs_models/${modelKey}/weight_specs`)!;
//      const model_topology = localStorage.getItem(`tensorflowjs_models/${modelKey}/model_topology`)!;
//      const info = localStorage.getItem(`tensorflowjs_models/${modelKey}/info`)!;

//      const persistedModel :TFPersistedModelV1 = {
//          version: 1,
//          model: {model_metadata, weight_data, weight_specs, model_topology, info},
//          classNames: m.classNames,
//          imageHeight: m.imageHeight,
//          imageWidth: m.imageWidth,
//          maxAbsoluteRawValue: m.maxAbsoluteRawValue,
//      }
//      const modelString = JSON.stringify(persistedModel);

//      localStorage.setItem(`models/${modelKey}`, modelString);

//      if (isIframe()) metaframe.setOutput('model', modelString);
// }

// const loadModel = async (modelKey :string) :Promise<PersistedModel|undefined> => {
//     return undefined;
//      const modelString :string = await store.get(`models/${modelKey}`);

//       const modelString = localStorage.getItem(`models/${modelKey}`);
//      if (modelString) {
//          const modelBlob :TFPersistedModelV1 = JSON.parse(modelString);
//          Object.keys(modelBlob.model).forEach(key => localStorage.setItem(`tensorflowjs_models/${modelKey}/${key}`, modelBlob.model[key]))
//          const model = await tf.loadLayersModel(`localstorage://${modelKey}`);
//          const persistedModel :PersistedModel = {
//              model,
//              classNames: modelBlob.classNames,
//              imageHeight: modelBlob.imageHeight,
//              imageWidth: modelBlob.imageWidth,
//              maxAbsoluteRawValue: modelBlob.maxAbsoluteRawValue,
//          }
//          updateMessage('Model ready', 'green');
//          return persistedModel;
//      }
// }

const setModelCount = async () => {
  const allModels = await tf.io.listModels();
  const cachedModelCount = Object.keys(allModels).length;
  document.getElementById("cachebuttoncontent")!.innerText = `Clear cache (${cachedModelCount} models)`;
};

const processPrediction = (example : SensorSeries): Float32Array => {
  if (!example) {
    throw "processExample: missing example";
  }
  if (!model) {
    throw "processExample: missing model";
  }

  // remove the time arrays, they aren't really adding much I think
  Object.keys(example).forEach((stream : string) => {
    if (stream.endsWith("t")) {
      delete example[stream];
    }
  });

  // TODO this is a hack, won't always work, but I can't remember right now
  const timesteps = Math.max(model.meta.prediction.imageHeight, model.meta.prediction.imageWidth);

  // trim/extend so same timeSteps
  Object.keys(example).forEach((stream) => {
    if (example[stream].length > timesteps) {
      example[stream] = example[stream].slice(0, timesteps);
    }
    // ensure length == timeSteps
    if (example[stream].length < timesteps) {
      const next = new Float32Array(timesteps);
      next.set(example[stream]);
      example[stream] = next;
    }
  });

  // normalize over max over all training examples
  Object.keys(example).forEach((stream : string) => {
    example[stream].forEach((val : number, index : number, arr : Float32Array | Int32Array) => {
      arr[index] = val / model !.meta.prediction.maxAbsoluteRawValue;
    });
  });

  // put all data in a big array
  // TODO can we just create the tensor3d here would it be faster?
  const dataArray = new Float32Array(1 * model.meta.prediction.imageWidth * model.meta.prediction.imageHeight);
  Object.keys(example).forEach((stream, streamIndex) => {
    const offset: number = streamIndex * timesteps;
    dataArray.set(example[stream], offset);
  });

  return dataArray;
};

const predict = async (input : PredictionInput) => {
  if (!model) {
    updateMessage("Asked to predict sample but no model loaded", "warning");
    return;
  }
  if (!input) {
    updateMessage("Asked to predict but no input", "warning");
    return;
  }

  if (!input.series) {
    updateMessage('Asked to predict but input lacks "series" field', "warning");
    return;
  }

  const sampleFloatArrays: SensorSeries = input.series;
  const processedSample = processPrediction(sampleFloatArrays);
  const xs = tf.tensor3d(processedSample, [1, model.meta.prediction.imageHeight, model.meta.prediction.imageWidth]);
  const prediction = (model.model.predictOnBatch(xs)as tf.Tensor < Rank >).dataSync();

  let highest: number = 0;
  let className: string = "";
  const predictionMap: {
    [key: string]: number
  } = {};

  model.meta.prediction.classNames.forEach((value : string, index : number) => {
    predictionMap[value] = prediction[index] as number;
    if (prediction[index] > highest) {
      highest = prediction[index];
      className = value;
    }
  });
  console.log(`Prediction: ${className} (${highest})`);
  const predictionJson: PredictionResult = {
    prediction: className,
    predictions: predictionMap,
    requestId: input.requestId,
    modelHash: model.meta.training.trainingDataHash
  };

  document.getElementById("evaluation-result")!.innerHTML = `
      ${className} @${new Date().toISOString().split("T")[1]}
    `;

  if (isIframe()) 
    metaframe.setOutput("prediction", predictionJson);
  };

const onNewTrainingData: (t : TrainingDataSet) => void = async (trainingDataSet) => {
  console.log("onNewTrainingData");

  // const loadedModel = await loadModel(hash);
  // if (loadedModel) {
  //   model = loadedModel;
  //   updateMessage('Model ready (cached)', 'green');
  //   return;
  // }

  // ? shut down any existing objects to free memory/resources, or they just get GC'd
  const trainingData = new TrainingData(trainingDataSet);
  updateMessage("Training", "yellow", ["metaframe input: TrainingDataSet", "loading data..."]);
  await trainingData.load();
  console.log("LOADED training data");

  const hash = trainingData.hash();

  if (hashTrainingDataCurrentlyComputing) {
    console.log("Currently training, will train again after");
    return;
  }

  console.log(`LOADED training data [${hash}]`);

  // record the current training data hash so that we don't train concurrently
  hashTrainingDataCurrentlyComputing = hash;

  const meta: PersistedModelMetadata = {
    prediction: {
      classNames: trainingData.classNames,
      imageHeight: trainingData.imageHeight,
      imageWidth: trainingData.imageWidth,
      maxAbsoluteRawValue: trainingData._maxAbsoluteValue
    },
    training: {
      date: new Date(),
      trainingDataHash: hash
    }
  };

  // check if we have a cached tensorflow model saved locally
  // const loadedModel = await tf.loadModel('indexeddb://my-model-1');
  console.log(`checking nocache=${nocache} [${hash}]`);
  if (!nocache) {
    const allModels = await tf.io.listModels();
    if (allModels[`indexeddb://${hash}`]) {
      const loadedModel = await tf.loadLayersModel(`indexeddb://${hash}`);
      console.log(`loadedModel=${ !!loadedModel} [${hash}]`);
      console.log(`checking loadedModel model found`);
      model = {
        model: loadedModel,
        meta: meta
      };

      if (isIframe()) {
        const persistedModelJson: PersistedModelJson = await modelToJson(model);
        console.log(`metaframe.setOutput model`);
        metaframe.setOutput("model", persistedModelJson);
      }
      updateMessage("Model ready (cached)", "green");
      // lose the training marker
      hashTrainingDataCurrentlyComputing = undefined;

      return;
    } else {
      console.log(`no loadedModel [${hash}]`);
    }
  }

  updateMessage("Training", "yellow", ["metaframe input: TrainingDataSet", "loaded", "training..."]);
  const trainer = new Trainer(trainingData);
  await trainer.train();
  updateMessage("Training", "green", ["metaframe input: TrainingDataSet", "loaded", "trained!"]);

  model = {
    model: trainer.model,
    meta: meta
  };

  if (!nocache) {
    console.log(`saving trained model indexeddb://${hash}`);
    const saveResult = await model.model.save(`indexeddb://${hash}`);
    console.log("saveResult", saveResult);
    await setModelCount();
  }
  if (isIframe()) {
    console.log(`modelToJson`);
    const persistedModelJson: PersistedModelJson = await modelToJson(model);
    console.log(`metaframe.setOutput`);
    metaframe.setOutput("model", persistedModelJson);
  }

  // await saveModel(model, modelId);
  // await saveModel(model, hash);
  // console.log('trainer.model', trainer.model);

  updateMessage("Model ready", "green");

  //       const container = document.getElementById('ModelSummary');
  //   tfvis.show.modelSummary(container, trainer.model);

  //   await showAccuracy(trainer.model, data);

  // save so we can load immediately next time
  //   await trainer.model.save(`localstorage://${modelId}`);
  //   model = trainer.model;
};

const debugTrainOnTempSavedInputs = async () => {
  const trainingDataSetString = localStorage.getItem(`TrainingDataSet${id}`);
  if (trainingDataSetString) {
    const trainingDataSet: TrainingDataSet = JSON.parse(trainingDataSetString);
    onNewTrainingData(trainingDataSet);
  }
};

// const figureOutPredict = async () => {
//     const model = await tf.loadLayersModel(`localstorage://${modelId}`);
//     console.log('model', model);
//     console.log('model.toJSON();', model.toJSON());
//     console.log('model.getConfig()', model.getConfig());
//     updateMessage('Model ready', 'green');

//     updateMessage('Model ready', 'green', ['loading saved training data']);
//      get the temporarily saved training data. No
//     const trainingDataSet :TrainingDataSet = JSON.parse(localStorage.getItem(`TrainingDataSet${id}`)!);
//     const trainingData  = new TrainingData(trainingDataSet);
//     updateMessage('Model ready', 'green', ['loaded saved training data', 'processing training data']);
//     await trainingData.load();
//     updateMessage('Model ready', 'green', ['loaded saved training data', 'processed training data', 'evaluating']);
//      trainingDataSet.examples.forEach(e => console.log(e.label));
//     const example:TrainingDataPoint = trainingDataSet.examples.find((e) => {
//         return e.label === 'anti_clockwise_circle_from_top';
//     })!;

//      get the example data wrapper
//      get the "raw" data, a Map< sensorname,Float32Array> (e.g. ax=>[1,2,3])
//     const jsonData :SensorSeries = gesture.data!;

//     const rawNumberArray :Float32Array = trainingData.processPrediction(jsonData);

//     const batchImagesArray = rawNumberArray;
//     const xs = tf.tensor3d(batchImagesArray, [1, trainingData.imageHeight, trainingData.imageWidth]);
//     const prediction = (model.predictOnBatch(xs) as tf.Tensor<Rank>).dataSync();

//     let highest :number = 0;
//     let className :string = '';
//     trainingData.classNames.forEach((value, index) => {
//         if (prediction[index] > highest) {
//             highest = prediction[index];
//             className = value;
//         }
//     });
//     console.log(`Prediction: ${className} (${highest})`);
//      const index = prediction[0]
//      classNames

//      now how THE FUCK to feed it into the model
//      const exampleTensor = tf.tensor(rawNumberArray, [ trainingData.height, trainingData.width ], 'float32');
//      const xs = tf.tensor2d(exampleTensor, [1, trainingData.imageSize]);
//      console.log(model.summary())
//      const prediction = model.predict(exampleTensor, {batchSize:1, verbose:true});
// }

const run = async () => {
  // metaframe.onInputs((inputs :any) => {
  //   console.log('onInputs', inputs);
  // })
  metaframe.onInput("training", (t : TrainingDataSet) => {
    console.log("got metaframe input TrainingDataSet", t);
    if (!t.examples) {
      updateMessage('inputs["training"] (type TrainingDataSet) is missing field: "examples"', "error");
      return;
    }
    // localStorage.setItem(`TrainingDataSet${id}`, JSON.stringify(t));
    onNewTrainingData(t);
  });

  metaframe.onInput("prediction", (predictionData : PredictionInputEncoded) => {
    const predictionInput :PredictionInput = predictionDecode(predictionData);
    console.log("Got input prediction");
    predict(predictionInput);
    console.log("Set output prediction");
  });

  metaframe.onInput("model", async (modelJson : PersistedModelJson) => {
    console.log("Got input model", modelJson);
    // sanity check the value
    if (modelJson && Object.keys(modelJson).length > 1) {
      model = await jsonToModel(modelJson);
      console.log("Loaded input model");
    }
  });
  // jsonToModel

  // model = await loadModel(id);
  // debugTrainOnTempSavedInputs();
  // figureOutPredict();

  // get the temporarily saved training data. No
  // const trainingDataSet :TrainingDataSet = JSON.parse(localStorage.getItem(`TrainingDataSet${id}`)!);

  //  trainingDataSet.examples.forEach(e => console.log(e.label));
  // const example:TrainingDataPoint = trainingDataSet.examples.find((e) => {
  //     return e.label === 'anti_clockwise_circle_from_top';
  // })!;

  //  get the example data wrapper

  //  get the "raw" data, a Map< sensorname,Float32Array> (e.g. ax=>[1,2,3])
  // const jsonData :SensorSeries = gesture.data!;

  // predict(jsonData)
};

const updateMessage = (message : string, level = "info", messages : string[] = []) => {
  document.getElementById("message")!.innerHTML = `
    <div class="ui ${level} message visible ignored">
        <i class="close icon"></i>
        <div class="header">
          ${message}
        </div>
        <ul class="list">
            ${messages.map((m) => "<li>" + m + "</li>").join(" ")}
        </ul>
      </div>
    `;
};

document.addEventListener("DOMContentLoaded", run);

// cache button
setModelCount();

document.getElementById("cachebutton")!.onclick = async () => {
  const allModels = await tf.io.listModels();
  const deletions = Object.keys(allModels).map((key) => tf.io.removeModel(key));
  try {
    await Promise.all(deletions);
  } catch (err) {
    console.error(err);
  }
  await setModelCount();
};
