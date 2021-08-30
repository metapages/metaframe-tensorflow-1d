export type Base64String = string;


/**
 * Prediction/training types
 */

/**
 * Prediction/training types
 */

/* Generic map of keys to number arrays */
export interface SensorSeries {[key:string] : Float32Array};
export interface SensorSeriesBase64 {[key:string] : string };
/* Main persisted form of a single complete sensor example (e.g. a gesture) */
export interface PredictionInputEncoded {
  series: SensorSeriesBase64;
  requestId ?: string | number;
}

export interface PredictionInput {
  series: SensorSeries;
  requestId ?: string | number;
}

export const sensorSeriesDecode:(series :SensorSeriesBase64) => SensorSeries = series => {
  const result :SensorSeries = {};
  Object.keys(series).forEach(k => {
    if (series[k]) {
      result[k] = new Float32Array(base64decode(series[k]));
    }
  });
  return result;
}

export const predictionDecode:(prediction :PredictionInputEncoded) => PredictionInput = prediction => {
  console.log('predictionDecode', prediction);
  const result :PredictionInput = {
    requestId: prediction.requestId,
    series: sensorSeriesDecode(prediction.series),
  };
  return result;
}

export const predictionEncode:(prediction :PredictionInput) => PredictionInputEncoded = prediction => {
  const result :PredictionInputEncoded = {
    requestId: prediction.requestId,
    series: sensorSeriesEncode(prediction.series),
  };
  return result;
}

export const sensorSeriesEncode:(series :SensorSeries) => SensorSeriesBase64 = series => {
  const result :SensorSeriesBase64 = {};
  Object.keys(series).forEach(k => result[k] = base64encode(series[k].buffer));
  return result;
}

// export const convertIMUSensorJsonToExample :(example:IMUSensorJson) => IMUSensorExample = example => {
//   console.log('convertIMUSensorJsonToExample example', example);
//   return {
//       ax: new Float32Array(base64decode(example.ax)),
//       ay: new Float32Array(base64decode(example.ay)),
//       az: new Float32Array(base64decode(example.az)),
//       at: new Int32Array(base64decode(example.at)),
//       gx: new Float32Array(base64decode(example.gx)),
//       gy: new Float32Array(base64decode(example.gy)),
//       gz: new Float32Array(base64decode(example.gz)),
//       gt: new Int32Array(base64decode(example.gt)),
//   }
// }





/**
 * This is the output from an input prection
 * prediction: the class name of the prediction
 * predictions: map of class names to score
 */
export interface PredictionResult {
  prediction: string;
  predictions: {
    [className: string]: number
  };
  requestId ?: string | number;
  modelHash: string;
  modelId?: string;
  note?:string;
}

export interface TrainingDataPoint {
  version?: string; // TODO: solve versioning since this is a blob to the graphql API
  name?: string;
  label: string;
  url?: string;
  data: PredictionInputEncoded; // JSON transfer uses Base64String
}

export interface TrainingDataSet {
  // stored with the model, for bookkeeping
  modelId?: string;
  examples: Array<TrainingDataPoint>;
  /* examples for "no real gesture" */
  controlLabels?:string[];
  hash:string; // computed using object-hash
}

export interface PredictionMetadata {
  classNames: string[];
  imageHeight: number;
  imageWidth: number;

  // maxAbsoluteRawValue: number;
}

export interface TrainingMetadata {
  date: Date;
  hash: string;
  // Derived from training data, use for normalizing predictions
  // keys are series labels, e.g. ax, gy etc (**not** example labels)
  ranges: Record<string, {min:number, max:number, absmax:number}>;
}


/**
 * Low specific types
 */


/**
 * Handle streaming IMU data and convert to more friendly formats.
 * The internal data format is a dict of Float32Arrays representing
 * 1D time series from sensors. This should be easy to extend to arbitrary
 * sensor streams (or any set of 1D series).
 */


export interface IMUPoint {
  x: number;
  y: number;
  z: number;
  t: number;
}

// this could be any combination of points depending on when they're streaming in
export interface IMUPointCombined {
  ax?: number;
  ay?: number;
  az?: number;
  at?: number;
  gx?: number;
  gy?: number;
  gz?: number;
  gt?: number;
  t?: number;
}


export interface IMUPointCombinedExample {
  data :Array<IMUPointCombined>;
}
export interface IMUSensorGesture {
  accelerometer :Array<IMUPoint>;
  gyroscope :Array<IMUPoint>;
}



export interface IMUGestureChunk {
  a ?: IMUPoint;
  g ?: IMUPoint;
  event? :string;
}

export interface IMUSensorJson {
  ax :Base64String;
  ay :Base64String;
  az :Base64String;
  at :Base64String;
  gx :Base64String;
  gy :Base64String;
  gz :Base64String;
  gt :Base64String;
}

export interface IMUSensorExample {
  ax :Float32Array;
  ay :Float32Array;
  az :Float32Array;
  at :Int32Array;
  gx :Float32Array;
  gy :Float32Array;
  gz :Float32Array;
  gt :Int32Array;
}


// the sensor gesture needs to be compacted
export const convertIMUSensorExampleToJson :(example:IMUSensorExample) => IMUSensorJson = example => {
  return {
      ax: base64encode(example.ax.buffer),
      ay: base64encode(example.ay.buffer),
      az: base64encode(example.az.buffer),
      at: base64encode(example.at.buffer),
      gx: base64encode(example.gx.buffer),
      gy: base64encode(example.gy.buffer),
      gz: base64encode(example.gz.buffer),
      gt: base64encode(example.gt.buffer),
  }
}

// SensorSeries

// the sensor gesture needs to be compacted
export const convertIMUSensorJsonToExample :(example:IMUSensorJson) => IMUSensorExample = example => {
  return {
      ax: new Float32Array(base64decode(example.ax)),
      ay: new Float32Array(base64decode(example.ay)),
      az: new Float32Array(base64decode(example.az)),
      at: new Int32Array(base64decode(example.at)),
      gx: new Float32Array(base64decode(example.gx)),
      gy: new Float32Array(base64decode(example.gy)),
      gz: new Float32Array(base64decode(example.gz)),
      gt: new Int32Array(base64decode(example.gt)),
  }
}



/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
const lookup = new Uint8Array(256);
for (var i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

export function base64encode(arraybuffer : ArrayBuffer) :string {
  let bytes = new Uint8Array(arraybuffer);
  let i: number;
  let len = bytes.length;
  let base64 = "";

  for (i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }

  return base64;
}

export function base64decode(base64 : string) :ArrayBuffer {
    if (!base64) {
        throw new Error("base64decode string argument given");
    }
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i:number,
    p = 0,
    encoded1: number,
    encoded2: number,
    encoded3: number,
    encoded4: number;

  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }

  var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
}
