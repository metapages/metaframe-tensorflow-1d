import { Base64String } from './types';
import * as base64 from './base64';

// const tab64 = {
//   encode: (x :any) :string => '',
//   decode: (x :any, s :string) :any =>  new Float32Array(),
// }

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

export interface IMUSensorGesture2 {
  ax :number[];
  ay :number[];
  az :number[];
  at :number[];
  gx :number[];
  gy :number[];
  gz :number[];
  gt :number[];
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
// export const convertIMUSensorGestureToIMUSensorExample :(gesture:IMUPointCombinedExample) => IMUSensorExample = gesture => {

//   return {
//       ax: new Float32Array(gesture.accelerometer.map(getX)),
//       ay: new Float32Array(gesture.accelerometer.map(getY)),
//       az: new Float32Array(gesture.accelerometer.map(getZ)),
//       at: new Float32Array(gesture.accelerometer.map(getT)),
//       gx: new Float32Array(gesture.gyroscope.map(getX)),
//       gy: new Float32Array(gesture.gyroscope.map(getY)),
//       gz: new Float32Array(gesture.gyroscope.map(getZ)),
//       gt: new Float32Array(gesture.gyroscope.map(getT)),
//   }
// }


// the sensor gesture needs to be compacted
export const convertIMUSensorGesture2ToIMUSensorExample :(gesture:IMUSensorGesture2) => IMUSensorExample = gesture => {
  return {
      ax: new Float32Array(gesture.ax),
      ay: new Float32Array(gesture.ay),
      az: new Float32Array(gesture.az),
      at: new Int32Array(gesture.at),
      gx: new Float32Array(gesture.gx),
      gy: new Float32Array(gesture.gy),
      gz: new Float32Array(gesture.gz),
      gt: new Int32Array(gesture.gt),
  }
}

// the sensor gesture needs to be compacted
export const convertIMUSensorExampleToJson :(example:IMUSensorExample) => IMUSensorJson = example => {
  return {
      ax: base64.encode(example.ax.buffer),
      ay: base64.encode(example.ay.buffer),
      az: base64.encode(example.az.buffer),
      at: base64.encode(example.at.buffer),
      gx: base64.encode(example.gx.buffer),
      gy: base64.encode(example.gy.buffer),
      gz: base64.encode(example.gz.buffer),
      gt: base64.encode(example.gt.buffer),
  }
}

// the sensor gesture needs to be compacted
export const convertIMUSensorJsonToExample :(example:IMUSensorJson) => IMUSensorExample = example => {
  // console.log('convertIMUSensorJsonToExample example', example);
  return {
      ax: new Float32Array(base64.decode(example.ax)),
      ay: new Float32Array(base64.decode(example.ay)),
      az: new Float32Array(base64.decode(example.az)),
      at: new Int32Array(base64.decode(example.at)),
      gx: new Float32Array(base64.decode(example.gx)),
      gy: new Float32Array(base64.decode(example.gy)),
      gz: new Float32Array(base64.decode(example.gz)),
      gt: new Int32Array(base64.decode(example.gt)),
  }
}

export class IMUData {

  static fromGesture() :IMUData {
    return new IMUData().gestureBegin();
  }

  static fromJson(blob :IMUSensorJson) :IMUData {

    const data :IMUSensorExample = convertIMUSensorJsonToExample(blob);
    return new IMUData(data);
  }

  static fromJsonString(s :string) :IMUData {
    return IMUData.fromJson(JSON.parse(s));
  }

  static fromObjectOrJsonString(thing :any) :IMUData {
    if (typeof(thing) === 'string') {
      const unknownObject :any = JSON.parse(thing);
      if (unknownObject.ay) {
          return IMUData.fromJson(unknownObject);
      } else if (unknownObject.data) {
          return IMUData.fromJson(unknownObject.data);
      } else {
          throw "Unrecognized JSON object";
      }
    } else {
        return IMUData.fromJson(thing);
    }
  }

  _streamingBuffer :IMUSensorGesture2 | null;
  _data :IMUSensorExample | null;

  constructor(data ?:IMUSensorExample) {
    this._data = data || null;
    this._streamingBuffer = null;
  }

  get data() :IMUSensorExample | null {
    return this._data;
  }

  get length() :number {
    if (!this._data) {
      throw new Error('No sensor data: .length fails');
    }
    return Math.max(this._data.at.length, this._data.gt.length);
  }

  toJson() :IMUSensorJson {
    if (!this._data) {
      throw new Error('No sensor data: cannot convert to JSON');
    }
    return convertIMUSensorExampleToJson(this._data);
  }

  toJsonString() :string {
    return JSON.stringify(this.toJson());
  }

  // idk what this should look like rn, since there's processing on the matrices when learning
  toMatrix() {
    
  }

  gestureBegin() :IMUData {
    if (this._data) {
      throw new Error('"_data" gesture already began and finished. Create a new instance');
    }
    this._streamingBuffer = {ax:[], ay:[], az:[], at:[], gx:[], gy:[], gz:[], gt:[]};
    return this;
  }

  gestureEnd() {
    if (!this._streamingBuffer) {
      throw new Error('No sensor buffer: cannot end');
    }
    if (this._data) {
      throw new Error('"_data" gesture already began and finished. Create a new instance');
    }
    this._data = convertIMUSensorGesture2ToIMUSensorExample(this._streamingBuffer);
    this._streamingBuffer = null;
  }

  addGestureChunk(chunk :IMUGestureChunk) {
    if (this._data) {
      throw new Error('Gesture has already ended');
    }
    if (!this._streamingBuffer) {
      this.gestureBegin();
    }
    if (chunk.a) {
      this._streamingBuffer!.ax.push(chunk.a.x);
      this._streamingBuffer!.ay.push(chunk.a.y);
      this._streamingBuffer!.az.push(chunk.a.z);
      this._streamingBuffer!.at.push(chunk.a.t);
    }
    if (chunk.g) {
      this._streamingBuffer!.gx.push(chunk.g.x);
      this._streamingBuffer!.gy.push(chunk.g.y);
      this._streamingBuffer!.gz.push(chunk.g.z);
      this._streamingBuffer!.gt.push(chunk.g.t);
    }
  }
}

// const getX :(point :IMUPoint) => number = point => point.x;
// const getY :(point :IMUPoint) => number = point => point.y;
// const getZ :(point :IMUPoint) => number = point => point.z;
// const getT :(point :IMUPoint) => number = point => point.t;

