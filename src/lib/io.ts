import * as tf from "@tensorflow/tfjs";
import {PersistedModel, PersistedModelJson} from "./types";
import {base64encode, base64decode, SensorSeries, PredictionInput, PredictionResult} from "./metaframe";

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


export const jsonToModel = async (m : PersistedModelJson): Promise<PersistedModel> => {
  const handlerLoader = new JsonIOHandler(m.model);
  const loadedModel = await tf.loadLayersModel(handlerLoader);
  const persistedModel: PersistedModel = Object.assign({}, m);
  persistedModel.model = loadedModel;
  return persistedModel;
};

export const modelToJson = async (m : PersistedModel): Promise<PersistedModelJson> => {
  const handlerSaver = new JsonIOHandler();
  const saveResult = await m.model.save(handlerSaver);
  // console.log("saveResult", saveResult);
  const persistedModelJson: PersistedModelJson = Object.assign({}, m);
  persistedModelJson.model = handlerSaver.modelJson;
  return persistedModelJson;
};

class JsonIOHandler implements tf.io.IOHandler {
  modelJson: any;
  constructor(input? : any) {
    this.modelJson = input;
  }

  async save(modelArtifact : tf.io.ModelArtifacts): Promise < tf.io.SaveResult > {
    const saveResult: tf.io.SaveResult = {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: "JSON",
        modelTopologyBytes: (modelArtifact.modelTopology as ArrayBuffer).byteLength,
        // weightSpecsBytes: unknown,
        weightDataBytes: (modelArtifact.weightData as ArrayBuffer).byteLength
      }
    };
    try {
      this.modelJson = Object.assign({}, modelArtifact);
      this.modelJson.modelTopology = base64encode(modelArtifact.modelTopology as ArrayBuffer);
      this.modelJson.weightData = base64encode(modelArtifact.weightData as ArrayBuffer);
      return saveResult;
    } catch (err) {
      saveResult.errors = [`{err}`];
      return saveResult;
    }
  }
  async load(): Promise < tf.io.ModelArtifacts > {
    console.log("JsonIOHandler.loading");
    const modelArtifacts: tf.io.ModelArtifacts = Object.assign({}, this.modelJson);
    modelArtifacts.modelTopology = base64decode(this.modelJson.modelTopology as string);
    modelArtifacts.weightData = base64decode(this.modelJson.weightData as string);
    console.log("JsonIOHandler.modelArtifacts", modelArtifacts);
    return modelArtifacts;
  }
}

export const predict = async (
  model: PersistedModel,
  input: PredictionInput
): Promise<[PredictionResult | undefined, Error | undefined]> => {
  if (!model) {
    return [
      undefined,
      new Error("Asked to predict sample but no model loaded"),
    ];
  }
  if (!input) {
    return [
      undefined,
      new Error("Asked to predict but no input"),
    ];
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
  let note:string|undefined;
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

  if (labelWithHighestScore !== "_" && predictionMap[labelWithHighestScore] < 0.45 && predictionMap["_"]) {
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

  // document.getElementById("evaluation-result")!.innerHTML = `
  //     ${className} @${new Date().toISOString().split("T")[1]}
  //   `;

  // if (isIframe()) metaframe.setOutput("prediction", predictionJson);
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

  console.log('keys', keys);

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




/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 *
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

// export const Base64Binary = {
// 	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

// 	/* will return a  Uint8Array type */
// 	decodeArrayBuffer: function(input) {
// 		var bytes = (input.length/4) * 3;
// 		var ab = new ArrayBuffer(bytes);
// 		this.decode(input, ab);

// 		return ab;
// 	},

// 	removePaddingChars: function(input){
// 		var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
// 		if(lkey == 64){
// 			return input.substring(0,input.length - 1);
// 		}
// 		return input;
// 	},

// 	decode: function (input :string, arrayBuffer ?:ArrayBuffer) :Uint8Array {
// 	 get last chars to see if are valid
// 		input = this.removePaddingChars(input);
// 		input = this.removePaddingChars(input);

// 		var bytes = parseInt("" + (input.length / 4) * 3, 10);

// 		var uarray;
// 		var chr1, chr2, chr3;
// 		var enc1, enc2, enc3, enc4;
// 		var i = 0;
// 		var j = 0;

// 		if (arrayBuffer)
// 			uarray = new Uint8Array(arrayBuffer);
// 		else
// 			uarray = new Uint8Array(bytes);

// 		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

// 		for (i=0; i<bytes; i+=3) {
// 		 get the 3 octects in 4 ascii chars
// 			enc1 = this._keyStr.indexOf(input.charAt(j++));
// 			enc2 = this._keyStr.indexOf(input.charAt(j++));
// 			enc3 = this._keyStr.indexOf(input.charAt(j++));
// 			enc4 = this._keyStr.indexOf(input.charAt(j++));

// 			chr1 = (enc1 << 2) | (enc2 >> 4);
// 			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
// 			chr3 = ((enc3 & 3) << 6) | enc4;

// 			uarray[i] = chr1;
// 			if (enc3 != 64) uarray[i+1] = chr2;
// 			if (enc4 != 64) uarray[i+2] = chr3;
// 		}

// 		return uarray;
// 	}
// }

// export function base64ArrayBuffer(arrayBuffer :ArrayBuffer) :string {
//     var base64    = ''
//     var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

//     var bytes         = new Uint8Array(arrayBuffer)
//     var byteLength    = bytes.byteLength
//     var byteRemainder = byteLength % 3
//     var mainLength    = byteLength - byteRemainder

//     var a, b, c, d
//     var chunk

//      Main loop deals with bytes in chunks of 3
//     for (var i = 0; i < mainLength; i = i + 3) {
//        Combine the three bytes into a single integer
//       chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

//        Use bitmasks to extract 6-bit segments from the triplet
//       a = (chunk & 16515072) >> 18  16515072 = (2^6 - 1) << 18
//       b = (chunk & 258048)   >> 12  258048   = (2^6 - 1) << 12
//       c = (chunk & 4032)     >>  6  4032     = (2^6 - 1) << 6
//       d = chunk & 63                63       = 2^6 - 1

//        Convert the raw binary segments to the appropriate ASCII encoding
//       base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
//     }

//      Deal with the remaining bytes and padding
//     if (byteRemainder == 1) {
//       chunk = bytes[mainLength]

//       a = (chunk & 252) >> 2  252 = (2^6 - 1) << 2

//        Set the 4 least significant bits to zero
//       b = (chunk & 3)   << 4  3   = 2^2 - 1

//       base64 += encodings[a] + encodings[b] + '=='
//     } else if (byteRemainder == 2) {
//       chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

//       a = (chunk & 64512) >> 10  64512 = (2^6 - 1) << 10
//       b = (chunk & 1008)  >>  4  1008  = (2^6 - 1) << 4

//        Set the 2 least significant bits to zero
//       c = (chunk & 15)    <<  2  15    = 2^4 - 1

//       base64 += encodings[a] + encodings[b] + encodings[c] + '='
//     }

//     return base64
//   }
