import {
  convertIMUSensorExampleToJson,
  convertIMUSensorGesture2ToIMUSensorExample,
  convertIMUSensorJsonToExample,
  IMUGestureChunk,
  IMUSensorExample,
  IMUSensorGesture2,
  IMUSensorJson,
} from "./metaframe";

export class IMUData {
  static fromGesture(): IMUData {
    return new IMUData().gestureBegin();
  }

  static fromJson(blob : IMUSensorJson): IMUData {
    const data: IMUSensorExample = convertIMUSensorJsonToExample(blob);
    return new IMUData(data);
  }

  static fromJsonString(s : string): IMUData {
    return IMUData.fromJson(JSON.parse(s));
  }

  static fromObjectOrJsonString(thing : any): IMUData {
    if (typeof thing === "string") {
      const unknownObject: any = JSON.parse(thing);
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

  _streamingBuffer: IMUSensorGesture2 | null;
  _data: IMUSensorExample | null;

  constructor(data? : IMUSensorExample) {
    this._data = data || null;
    this._streamingBuffer = null;
  }

  get data(): IMUSensorExample | null {
    return this._data;
  }

  get length(): number {
    if (!this._data) {
      throw new Error("No sensor data: .length fails");
    }
    return Math.max(this._data.at.length, this._data.gt.length);
  }

  toJson(): IMUSensorJson {
    if (!this._data) {
      throw new Error("No sensor data: cannot convert to JSON");
    }
    return convertIMUSensorExampleToJson(this._data);
  }

  toJsonString(): string {
    return JSON.stringify(this.toJson());
  }

  // idk what this should look like rn, since there's processing on the matrices when learning
  toMatrix() {}

  gestureBegin(): IMUData {
    if (this._data) {
      throw new Error('"_data" gesture already began and finished. Create a new instance');
    }
    this._streamingBuffer = {
      ax: [],
      ay: [],
      az: [],
      at: [],
      gx: [],
      gy: [],
      gz: [],
      gt: []
    };
    return this;
  }

  gestureEnd() {
    if (!this._streamingBuffer) {
      throw new Error("No sensor buffer: cannot end");
    }
    if (this._data) {
      throw new Error('"_data" gesture already began and finished. Create a new instance');
    }
    this._data = convertIMUSensorGesture2ToIMUSensorExample(this._streamingBuffer);
    this._streamingBuffer = null;
  }

  addGestureChunk(chunk : IMUGestureChunk) {
    if (this._data) {
      throw new Error("Gesture has already ended");
    }
    if (!this._streamingBuffer) {
      this.gestureBegin();
    }
    if (chunk.a) {
      this._streamingBuffer !.ax.push(chunk.a.x);
      this._streamingBuffer !.ay.push(chunk.a.y);
      this._streamingBuffer !.az.push(chunk.a.z);
      this._streamingBuffer !.at.push(chunk.a.t);
    }
    if (chunk.g) {
      this._streamingBuffer !.gx.push(chunk.g.x);
      this._streamingBuffer !.gy.push(chunk.g.y);
      this._streamingBuffer !.gz.push(chunk.g.z);
      this._streamingBuffer !.gt.push(chunk.g.t);
    }
  }
}

// const getX :(point :IMUPoint) => number = point => point.x;
// const getY :(point :IMUPoint) => number = point => point.y;
// const getZ :(point :IMUPoint) => number = point => point.z;
// const getT :(point :IMUPoint) => number = point => point.t;
