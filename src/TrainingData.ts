/**
 * @license
 * Private wand license.
 * Currently very specific to gestures, need to loosen that up
 */

/**
 * Some terminology
 * length or height of data set: in this case the time steps in the gyrometer samples.
 * width or depth: 6 (2 * [x,y,z] for accelerometer and gyrometer resp.)
 */



// const IMAGE_SIZE = 784;
// const NUM_CLASSES = 10;
// const NUM_DATASET_ELEMENTS = 65000;

// const TRAIN_TEST_RATIO = 5 / 6;

// const NUM_TRAIN_ELEMENTS = Math.floor(TRAIN_TEST_RATIO * NUM_DATASET_ELEMENTS);
// const NUM_TEST_ELEMENTS = NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS;

// const MNIST_IMAGES_SPRITE_PATH =
//     'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png';
// const MNIST_LABELS_PATH =
//     'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8';

/**
 * A class that fetches the sprited MNIST dataset and returns shuffled batches.
 *
 * NOTE: This will get much easier. For now, we do data fetching and
 * manipulation manually.
 */
import * as objectHash from "object-hash";
// import { TrainingDataSet } from './types';
import * as tf from '@tensorflow/tfjs';
import { TrainingDataSet, IMUSensorExample } from './metaframe';
import {IMUData} from './IMUData';

// const sensorNames = ['accelerometer', 'gyroscope'];
// const axes = ['x', 'y', 'z'];
// Proportion of all examples used for training. The rest are used for testing.
const proportionTrainingSamples = 0.7;

// const count = (a, b) => a + b;

type GestureJson = {data:IMUSensorExample, url:string};

/**
 * async load() is where the important data filtering happens
 */
export class TrainingData {
    trainingDataJson:TrainingDataSet;
    
    // action: {data:exampleData, url:title}
    // <GestureName, Array<GestureJson>>
    data:{ [key: string]: GestureJson[]; } = {}; // Final processed data
    dataArrays:any = {};
    _classes:string[] = [];
    // e.g. [ ax ay az gx gy gz ] computed from examples
    _streams :string[] = [];

    // From the previous thing, not yet able to use these, will do soon
    shuffledTrainIndex:number = 0;
    shuffledTestIndex:number = 0;

    trainingIndices:Uint32Array = new Uint32Array();
    testingIndices:Uint32Array = new Uint32Array();

    bigFatDataArray:Float32Array = new Float32Array();
    bigFatLabelArray:Uint8Array = new Uint8Array();

    _timesteps:number = 0;
    _maxAbsoluteValue:number = 0;


  constructor(trainingJson :TrainingDataSet) {
    // The device data blob, holds URLs to the actual data
    this.trainingDataJson = trainingJson;
  }

  hash() :string {
    if (!this.trainingDataJson) {
      throw "No trainingDataJson to hash";
    }
    return objectHash.default(this.trainingDataJson);
  }

  nextTrainBatch(batchSize :number) {
    return this.nextBatch(batchSize, this.trainingIndices);
  }

  nextTestBatch(batchSize :number) {
    return this.nextBatch(batchSize, this.testingIndices);
  }

  nextBatch(batchSize :number, indices :Uint32Array) {
    const batchImagesArray = new Float32Array(batchSize * this.imageSize);
    const batchLabelsArray = new Uint8Array(batchSize * this.numClasses);
    console.assert(this.numClasses > 0);

    for (let i = 0; i < batchSize; i++) {
      // Cycle through indices if we exceed the range, this repeats examples, I hope that's fine ¯\_(ツ)_/¯
      const idx = indices[i % indices.length];

      const startIndexData = idx * this.imageSize;
      const image =
          this.bigFatDataArray.slice(startIndexData, startIndexData + this.imageSize);
      batchImagesArray.set(image, i * this.imageSize);

      const startIndexLabels = idx * this.numClasses;
      const label =
        this.bigFatLabelArray.slice(startIndexLabels, startIndexLabels + this.numClasses);
      batchLabelsArray.set(label, i * this.numClasses);
    }

    const xs = tf.tensor2d(batchImagesArray, [batchSize, this.imageSize]);
    const labels = tf.tensor2d(batchLabelsArray, [batchSize, this.numClasses]);

    // are the labels ok?
    // const labelStrings = [];
    // for (let i = 0; i < batchLabelsArray.length; i+= this.numClasses) {
    //   const slice = batchLabelsArray.slice(i, i + 4);
    //   const label = this.classNames[slice.indexOf(1)];
    //   labelStrings.push(label);
    // }
    // console.log('labelStrings', labelStrings);

    return {xs, labels};
  }

  // createModel() {
  //   this.model = tf.sequential({
  //     layers: [
  //       tf.layers.conv1d({ kernelSize: 10, filters: 100, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.imageWidth, this.imageHeight, 1] }),
  //       tf.layers.conv1d({ kernelSize: 10, filters: 100, strides: 1, activation: 'relu' }),
  //       tf.layers.maxPooling1d(3),
  //       tf.layers.conv1d({ kernelSize: 10, filters: 160, strides: 1, activation: 'relu' }),
  //       tf.layers.conv1d({ kernelSize: 10, filters: 160, strides: 1, activation: 'relu' }),
  //       tf.layers.globalAveragePooling1d(),
  //       tf.layers.dropout(0.5),
  //       // Now we flatten the output from the 2D filters into a 1D vector to prepare
  //       // it for input into our last layer. This is common practice when feeding
  //       // higher dimensional data to a final classification output layer.
  //       // tf.layers.flatten(),
  //       // Our last layer is a dense layer which has 10 output units, one for each
  //       // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9).
  //       // const NUM_OUTPUT_CLASSES = 10;
  //       tf.layers.dense({ units: this.numClasses,  activation: 'softmax' }),// kernelInitializer: 'varianceScaling',

  //       // Choose an optimizer, loss function and accuracy metric,
  //     // // then compile and return the model
  //     // const optimizer = tf.train.adam();
  //     // this.model.compile({
  //     //     optimizer: optimizer,
  //     //     loss: 'categoricalCrossentropy',
  //     //     metrics: ['accuracy'],
  //     // });
  //     ]
  //   });

  //   // const IMAGE_WIDTH = this.imageWidth;
  //   // const IMAGE_HEIGHT = this.imageHeight;
  //   // const IMAGE_CHANNELS = 1;  

  //   // In the first layer of out convolutional neural network we have 
  //   // to specify the input shape. Then we specify some paramaters for 
  //   // the convolution operation that takes place in this layer.
  //   // https://www.tensorflow.org/api_docs/python/tf/layers/Conv2D
  //   // width is timesteps, height is accel[x,y,z]+gyro[x,y,z] (6)
  //   // this.model.add(tf.layers.conv2d({
  //   //     inputShape: [this.imageWidth, this.imageHeight, 1],
  //   //     kernelSize: [3, 1],
  //   //     filters: 8,
  //   //     strides: 1,
  //   //     activation: 'relu',
  //   //     kernelInitializer: 'varianceScaling'
  //   // }));

  //   // this.model.add(tf.layers.conv1d({
  //   //   inputShape: [this.imageWidth, this.imageHeight, 1],
  //   //   // kernelSize: [6, 10],
  //   //   kernelSize: 10,
  //   //   filters: 100,
  //   //   strides: 1,
  //   //   activation: 'relu',
  //   //   kernelInitializer: 'varianceScaling'
  //   // }));

  //   // this.model.add(tf.layers.conv1d({
  //   //   kernelSize: 10,
  //   //   filters: 100,
  //   //   strides: 1,
  //   //   activation: 'relu',
  //   //   // kernelInitializer: 'varianceScaling'
  //   // }));


  //   // this.model.add(tf.layers.maxPooling1d(3));

  //   // this.model.add(tf.layers.conv1d({
  //   //   kernelSize: 10,
  //   //   filters: 160,
  //   //   strides: 1,
  //   //   activation: 'relu',
  //   // }));

  //   // this.model.add(tf.layers.conv1d({
  //   //   kernelSize: 10,
  //   //   filters: 160,
  //   //   strides: 1,
  //   //   activation: 'relu',
  //   // }));

  //   // this.model.add(tf.layers.globalAveragePooling1d());


  // //   // The MaxPooling layer acts as a sort of downsampling using max values
  // //   // in a region instead of averaging.  
  // //   this.model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));

  //   // Repeat another conv2d + maxPooling stack. 
  //   // Note that we have more filters in the convolution.
  //   // this.model.add(tf.layers.conv2d({
  //   //     kernelSize: 3,
  //   //     filters: 16,
  //   //     strides: 1,
  //   //     activation: 'relu',
  //   //     kernelInitializer: 'varianceScaling'
  //   // }));
  // //   this.model.add(tf.layers.conv1d({
  // //     inputShape: [this.imageWidth, this.imageHeight, 1],
  // //     kernelSize: [6, 10],
  // //     filters: 100,
  // //     strides: 1,
  // //     activation: 'relu',
  // //     kernelInitializer: 'varianceScaling'
  // // }));


  // //   this.model.add(tf.layers.maxPooling2d({poolSize: [2, 2], strides: [2, 2]}));



  //   // Now we flatten the output from the 2D filters into a 1D vector to prepare
  //   // it for input into our last layer. This is common practice when feeding
  //   // higher dimensional data to a final classification output layer.
  //   // this.model.add(tf.layers.flatten());

  //   // // Our last layer is a dense layer which has 10 output units, one for each
  //   // // output class (i.e. 0, 1, 2, 3, 4, 5, 6, 7, 8, 9).
  //   // // const NUM_OUTPUT_CLASSES = 10;
  //   // this.model.add(tf.layers.dense({
  //   //     units: this.numClasses,
  //   //     kernelInitializer: 'varianceScaling',
  //   //     activation: 'softmax'
  //   // }));


  //   // Choose an optimizer, loss function and accuracy metric,
  //   // then compile and return the model
  //   const optimizer = tf.train.adam();
  //   this.model.compile({
  //       optimizer: optimizer,
  //       loss: 'categoricalCrossentropy',
  //       metrics: ['accuracy'],
  //   });

  //   return this.model;
  // }

  get classNames() {
    return this._classes;
  }

  get gestureNames() {
    return this.classNames;
  }

  get numClasses() {
    return this._classes.length;
  }

  get imageWidth() {
    return this._streams.length; // 6
  }

  get width() {
    return this.imageWidth;
  }

  get imageHeight() {
    return this.timeSteps
  }

  get height() {
    return this.imageHeight;
  }

  get imageSize() {
    return this.imageWidth * this.imageHeight;
  }

  get timeSteps() {
    return this._timesteps;
  }

  get trainingExampleCount() {
    return this.trainingIndices.length;
  }

  get testingExampleCount() {
    return this.testingIndices.length;
  }

  // Load a single gesture JSON blob
  async loadGesture(url) {
    const response = await fetch(url);
    var gestureJson = await response.json();
    
    
    // The original format is very inefficient.
    // TODO should just store this format from the beginning
    let length = gestureJson.accelerometer.length;
    const accelerometer = {
      x: new Float32Array(length),
      y: new Float32Array(length),
      z: new Float32Array(length),
      t: new Int32Array(length),
    };
    length = gestureJson.gyroscope.length;
    const gyroscope = {
      x: new Float32Array(length),
      y: new Float32Array(length),
      z: new Float32Array(length),
      t: new Int32Array(length),
    };
    for (let i = 0; i < gestureJson.accelerometer.length; i++) {
      accelerometer.x[i] = gestureJson.accelerometer[i].x;
      accelerometer.y[i] = gestureJson.accelerometer[i].y;
      accelerometer.z[i] = gestureJson.accelerometer[i].z;
      accelerometer.t[i] = gestureJson.accelerometer[i].t;
    }
    for (let i = 0; i < gestureJson.gyroscope.length; i++) {
      gyroscope.x[i] = gestureJson.gyroscope[i].x;
      gyroscope.y[i] = gestureJson.gyroscope[i].y;
      gyroscope.z[i] = gestureJson.gyroscope[i].z;
      gyroscope.t[i] = gestureJson.gyroscope[i].t;
    }
    return {accelerometer, gyroscope};
  }

  /**
   * 
  var x = {
    x: [2, 3, 4, 5],
    y: [16, 5, 11, 9],
    mode: 'lines',
    name: 'x'
  };

  var y = {
    x: [1, 2, 3, 4],
    y: [12, 9, 15, 12],
    mode: 'lines',
    name: 'y'
  };

  var data = [ x, y, z ]

   */
//   convertToPlotlyRaw(exampleBlob, gestureName) {
//     const example = exampleBlob.data;
//     const fileName = exampleBlob.url;
    
//     return sensorNames.map((sensorName) => {
//       const plotlyInitObj = {
//         data: [],
//         layout: {
//           margin: {l:10,r:10,t:20,b:10},
//           title: {
//             text: fileName,
//             font: {size: 8},
//           },
//           showlegend: false,
//           xaxis: {
//             showticklabels: false,
//           },
//           yaxis: {
//             showticklabels: false,
//           }
//         },
//         config: {
//           responsive: true,
//           displayModeBar: false,
//         },

//       };
//       axes.forEach((axis) => {
//         const plot = {
//           x:[], //These are plotly values, not the sensor x,y values
//           y:[],
//           mode: 'lines',
//           name: `${gestureName}:${sensorName}:${axis}:${fileName}`,
//         }
//         example[sensorName][axis].forEach((sensorDataPoint, sensorDataPointIndex) => {
//           plot.x.push(example[sensorName].t[sensorDataPointIndex]);
//           plot.y.push(sensorDataPoint);
//         });
//         plotlyInitObj.data.push(plot);
//       });

//       return plotlyInitObj;
//     });
//   }

//   getExamplesPlotlyRaw() {
//     const result = {};
//     Object.keys(this.data).forEach((gestureName) => {
//       result[gestureName] = this.data[gestureName].map(example => this.convertToPlotlyRaw(example, gestureName));
//     });
//     return result;
//   }

  // these are the slices of the huge data array and label array
//   convertToPlotlyProcessed(imageArray, labelName, imageIndex) {
//     const timeSteps = Array.apply(null, {length: this.timeSteps}).map(Number.call, Number);
//     let sensorArrayIndex = 0;
//     return sensorNames.map((sensorName) => {

//       const plotlyInitObj = {
//         data: [],
//         layout: {
//           margin: {l:10,r:10,t:20,b:10},
//           title: {
//             text: `${labelName}_${imageIndex}`,
//             font: {size: 8},
//           },
//           showlegend: false,
//           xaxis: {
//             showticklabels: false,
//           },
//           yaxis: {
//             showticklabels: false,
//           }
//         },
//         config: {
//           responsive: true,
//           displayModeBar: false,
//         },
  
//       };

//       axes.forEach((axis) => {
//         const plot = {
//           x   : [], //These are plotly values, not the sensor x,y values
//           y   : [],
//           mode: 'lines',
//           name: `${labelName}:${sensorName}:${axis}:${imageIndex}`,
//         };

//         const offset = sensorArrayIndex * this.timeSteps;
//         plot.y = imageArray.slice(offset, offset + this.timeSteps);
//         plot.x = timeSteps;

//         sensorArrayIndex++;

//         plotlyInitObj.data.push(plot);
//       });

//       return plotlyInitObj;
//     });
//   }

//   getExamplesPlotlyProcessed() {  
//     // this is very different from the raw, because we have to extract the data and labels out
//     // but that's the point: verification that the processing is ok
//     const result = {};
//     Object.keys(this.data).forEach((labelName) => {
//       result[labelName] = [];
//     });

//     const totalExampleCount = Object.keys(this.data).reduce((cur, action) => cur + this.data[action].length, 0);
//     const exampleIndices = Array.apply(null, {length: totalExampleCount}).map(Number.call, Number);
//     exampleIndices.forEach(exampleIndex => {
//       const labelArray = this.bigFatLabelArray.slice(exampleIndex * this.numClasses, (exampleIndex * this.numClasses) + this.numClasses);
//       const exampleArray = this.bigFatDataArray.slice(exampleIndex * this.imageSize, (exampleIndex * this.imageSize) + this.imageSize);

//       // validation: check label exists
//       if (labelArray.indexOf(1) === -1) {
//         console.log(`No label: ${labelArray}`);
//         throw `No label: ${labelArray}`;
//       }

//       const labelName = this.classNames[labelArray.indexOf(1)];

//       // validation: check that there is only one label
//       if (labelArray.reduce(count, 0) != 1) {
//         throw `${labelName} has more than one label: ${labelArray}`;
//       }

//       const plotData = this.convertToPlotlyProcessed(exampleArray, labelName, exampleIndex);

//       result[labelName].push(plotData);
//     });

//     return result;
//   }


  allNonTimeValues(iterateFunc :(dataPoint :number, dataPointIndex :number, data :Float32Array|Int32Array, stream:string, exampleIndex:number, gesturename:string)=>void) {// iterateFunc: (value, index, array, coordinate<x|y|z>, sensor <accelerometer|gyroscope>, exampleIndex, action)
    this.allNonTimeSensorStreams((sensorArray :Float32Array|Int32Array, sensorname:string, exampleIndex:number, gestureName:string) => {
        sensorArray.forEach((sensorDataPoint :number, sensorDataPointIndex) => {
            iterateFunc(sensorDataPoint, sensorDataPointIndex, sensorArray, sensorname, exampleIndex, gestureName);
        });
    });
  }

//   allTimes(iterateFunc :(data :IMUSensorExample, sensorname:string, exampleIndex:number, gesturename:string)=>void) {// iterateFunc: (value, array, index, 't', sensor <accelerometer|gyroscope>, exampleIndex, action)
//     this.allSensorStreams((sensorArrays, sensor, exampleIndex, gestureName) => {
//       sensorArrays.t.forEach((sensorDataPoint, sensorDataPointIndex) => {
//         iterateFunc(sensorDataPoint, sensorArrays, sensorDataPointIndex, 't', sensor, exampleIndex, gestureName);
//       });
//     });
//   }

  allSensorStreams(iterateFunc :(data :Float32Array|Int32Array, sensorname:string, exampleIndex:number, gesturename:string)=>void) { // iterateFunc: (object of xyzt arrays of sensor data points, sensor <ax ay etc>, exampleIndex, action)
    Object.keys(this.data).forEach((gestureName :string) => {
      const examples = this.data[gestureName];
      examples.forEach((exampleBlob, exampleIndex) => {
        const example = exampleBlob.data;
        // this._a
        this._streams.forEach((sensorName :string) => {
          iterateFunc(example[sensorName], sensorName, exampleIndex, gestureName);
        });
      });
    });
  }

  allNonTimeSensorStreams(iterateFunc :(data :Float32Array|Int32Array, sensorname:string, exampleIndex:number, gesturename:string)=>void) { // iterateFunc: (object of xyzt arrays of sensor data points, sensor <ax ay etc>, exampleIndex, action)
    Object.keys(this.data).forEach((gestureName :string) => {
      const examples = this.data[gestureName];
      examples.forEach((exampleBlob, exampleIndex) => {
        const example = exampleBlob.data;
        // this._a
        this._streams.forEach((sensorName :string) => {
            if (sensorName.endsWith('t')) {
                return;
            }
          iterateFunc(example[sensorName], sensorName, exampleIndex, gestureName);
        });
      });
    });
  }

  allExamples(iterateFunc :(data :IMUSensorExample, exampleIndex:number, gesturename:string)=>void) { // iterateFunc: (object of xyzt arrays of sensor data points, sensor <ax ay etc>, exampleIndex, action)
    Object.keys(this.data).forEach((gestureName :string) => {
      const examples = this.data[gestureName];
      examples.forEach((exampleBlob, exampleIndex) => {
        const example = exampleBlob.data;
        iterateFunc(example, exampleIndex, gestureName);
      });
    });
  }

  /**
   * {
  "accelerometer": [
    {
      "x": -8.828042030334473,
      "y": 3.8751418590545654,
      "z": 6.777905464172363,
      "t": 1552805816650
    },
   */
  getMaxValue() {
    let max = 0;
    const iter = (val :number) => {
      max = Math.max(Math.abs(val), max);
    }
    this.allNonTimeValues(iter);
    return max;
  }

  // Divide by the absolute max so all values [-1,1]
  normalize() {
    console.log('    normalizing...');
    let max = this.getMaxValue();
    this._maxAbsoluteValue = max;
    console.log(`        max=${max}`);
    this.allNonTimeValues((val, index, arr) => {
      arr[index] = val / max;
    });
  }

  // Time starts at zero (absolute time is recorded)
  zeroTime() {
    console.log('    zeroing time...');
    // iterateFunc: (arrays of sensor data points, sensor <accelerometer|gyroscope>, exampleIndex, action)
    this.allExamples((example) => {
        const timeStreams = this._streams.filter(s => s.endsWith('t'));

        // get the earliest time
        let minTime = Number.MAX_VALUE;
        timeStreams.forEach(timestream => {
            minTime = example[timestream].reduce((currentMin :number, sensorDataPoint:number) => Math.min(currentMin, sensorDataPoint), minTime);
        });

        // make that zero and adjust
        timeStreams.forEach(timestream => {
            example[timestream].forEach((time, index) => {
                example[timestream][index] = time - minTime;
            });
        });



        // timeStreams.forEach(timestream => {
        //     sensorArrays[timestream].forEach((time:number, index:number) => {
        //         sensorArrays.at[index] = time - minTime; 
        //     });
        // });



    //   sensorArrays.at.forEach((time, index) => {
    //     sensorArrays.at[index] = time - minTime; 
    //   });
    //   sensorArrays.gt.forEach((time, index) => {
    //     sensorArrays.gt[index] = time - minTime; 
    //   });
    });
  }

  // Time starts at zero (absolute time is recorded)
  trimToLongestNonZeroGesture() {
    console.log('    getting longest non-default gesture...');
    let max = 0;
    let maxAll = 0;
    const streamsWithoutTime = this._streams.filter(s => !s.endsWith('t'));
    this.allExamples((example, _, gesture) => {
        // control examples don't count
      if (gesture != '_') {
        // just grab the length of the first stream, assume all the same length
        let lastNonZero = example[this._streams[0]].length - 1;
        for ( ; lastNonZero >= 0;lastNonZero--) {
            // if any stream (ignoring time) contain a non-zero value, this is the end of the actual stream
            if (streamsWithoutTime.filter((stream) => example[stream][lastNonZero] != 0).length > 0) {
                break;
            }
        }
        max = Math.max(max, lastNonZero + 1);
      }
      maxAll = Math.max(maxAll, example[this._streams[0]].length);
    });
    console.log(`        [max=${max}] [maxAll=${maxAll}]...trimming...`);
    this.allExamples((example, _, gesture) => {
        this._streams.forEach((stream) => {
            example[stream] = example[stream].slice(0, max);
        })
    });
    // this.allSensorStreams((sensorArrays) => {
    //   this._streams.forEach((stream) => {
    //       if (!sensorArrays[stream]) {
    //           console.log(`stream=${stream} missing from sensorArrays=${sensorArrays}`);
    //       }
    //     sensorArrays[stream] = sensorArrays[stream].slice(0, max);
    //   });
    // });
    maxAll = 0;
    this.allSensorStreams((sensorArray) => {
      maxAll = Math.max(maxAll, sensorArray.length);
    });
    console.log(`        all arrays now [max=${maxAll}]`);
  }

  // All examples must be the same length
  // This will end up being the max input length?
  extend() {
    console.log('    extending...');
    let maxTimeSteps = 0;
    const timeDeltas :number[] = [];
    // this.allExamples((example, _, gesture) => {
    // });
    this.allSensorStreams((sensorArray) => {
      maxTimeSteps = Math.max(maxTimeSteps, sensorArray.length);
      sensorArray.forEach((point :number, index:number) => {
        if (index == 0) {
          return;
        }
        timeDeltas.push(point - sensorArray[index - 1]);
      });
    });
    // This probably won't matter but we're gonna make timesteps monotonic int counters,
    // ignoring actual millisecond differences, some detail will be lost but the data needs
    // to be smoothed anyway. Smoothing, if it happends should be done before this step.
    // const meanTimeDelta = Math.floor(timeDeltas.reduce((curTotal, val) => curTotal + val) / timeDeltas.length);
    // this.allSensorStreams((sensorArrays) => {
    //   if (sensorArrays.t.length < maxTimeSteps) {
    //     let newTimeIndex = sensorArrays.t.length;
    //     axes.concat(['t']).forEach((axis) => {
    //       const current = sensorArrays[axis];
    //       sensorArrays[axis] = new Float32Array(maxTimeSteps);
    //       sensorArrays[axis].set(current);
    //     });
    //     while (newTimeIndex < maxTimeSteps) {
    //       sensorArrays.t[newTimeIndex] = meanTimeDelta * newTimeIndex;
    //       newTimeIndex++;
    //     }
    //   }
    // });
    this._timesteps = maxTimeSteps;
    console.log(`        this.timeSteps=${this.timeSteps}`);
  }

  processExample(example :IMUSensorExample | null | undefined) :any {
    if (!example) {
      throw "processExample: missing example";
    }

    // remove the time arrays, they aren't really adding much I think
    Object.keys(example).forEach(stream => {
        if (stream.endsWith('t')) {
            delete example[stream];
        }
    })
  }

  processPrediction(example :IMUSensorExample) :Float32Array {
    if (!example) {
      throw "processExample: missing example";
    }
    if (this._timesteps === 0) {
      throw 'processPrediction but this._timesteps === 0';
    }
    this.processExample(example);

    // trim/extend so same timeSteps
    Object.keys(example).forEach(stream => {
      if (example[stream].length > this._timesteps) {
        example[stream] = example[stream].slice(0, this._timesteps);
      }
      // ensure length == timeSteps
      if (example[stream].length < this._timesteps) {
        const next = new Float32Array(this._timesteps);
        next.set(example[stream])
        example[stream] = next;
      }
    });

    // normalize over max over all training examples
    Object.keys(example).forEach(stream => {
      example[stream].forEach((val, index, arr) => {
        arr[index] = val / this._maxAbsoluteValue;
      });
    });

    const dataArray = new Float32Array(1 * this.imageSize);

    let sensorArrayIndex = 0;
    // sensorNames.forEach((sensor) => {
    this._streams.forEach((stream) => {
      const offset = sensorArrayIndex * this.timeSteps;
      dataArray.set(example[stream], offset);
      // next sensor stream
      sensorArrayIndex++;
    });

    return dataArray;
  }

  async load() {
    console.log(`Begin loading examples from ${this.trainingDataJson.examples.length} gestures and converting to float arrays...`);
    this.data = {};// <action, [{url:string,data:{x|y|z:Float32Array,t:Int32Array}}]>
    // const promises = [];
    // Load all the JSON blobs async
    this.data = {};
    const data = this.data;
    this._streams = [];
    const axesSet = {};
    this.trainingDataJson.examples.forEach((example) => {
        const action = example.label;
        if (!data[action]) {
            data[action] = [];
        }
        if (example.encoding === 'base64') {
            example.encoding
        }

        // console.log('example.data', example.data);
        let gesture :IMUData = IMUData.fromObjectOrJsonString(example.data);
        const jsonData :IMUSensorExample = gesture.data!;
        this.processExample(jsonData);

        Object.keys(jsonData!).forEach(a => axesSet[a] = true);
        data[action].push({data:gesture.data as IMUSensorExample, url:example.name || example.url as string});
    });

    this._streams = Object.keys(axesSet);
    this._streams.sort();
    this._classes = Object.keys(this.data);
  
    console.log('    done loading raw gesture data, begin preprocessing...');
    this.trimToLongestNonZeroGesture();
    this.normalize();
    const normalizedMax = this.getMaxValue();
    console.log(`        normalizedMax=${normalizedMax}`);
    if (normalizedMax != 1.0) {
      throw 'Failed to normalize';
    }
    this.zeroTime();
    this.extend();
    

    console.log('    converting to large combined float arrays...');
    // Building data and label arrays
    const totalExampleCount = Object.keys(this.data).reduce((cur, action) => cur + this.data[action].length, 0);
    this.bigFatDataArray = new Float32Array(totalExampleCount * this.imageSize);
    this.bigFatLabelArray = new Uint8Array(totalExampleCount * this.numClasses);
    
    console.log(`        totalExampleCount=${totalExampleCount} imageSize=${this.imageSize} numClasses=${this.numClasses}`);
    console.log(`            width=${this.width} height=${this.height}`);

    let arrayIndex = 0;
    this.classNames.forEach((gestureName, gestureIndex) => {
      
      const examples = this.data[gestureName];
      
      // Create the FloatArrays from the sensor stream data
      examples.forEach((exampleBlob) => {
        // Set the label value
        this.bigFatLabelArray[(arrayIndex * this.numClasses) + gestureIndex] = 1;
        // get the example and convert to a 6*timestep "image"
        const example = exampleBlob.data; // {accelerometer:{x|y|z: Float32Array,t:Int32Array}, gyroscope:...}
        // Copy the data into arrays
        // There are six of these ((acc+gyro)*(x+y+z))
        let sensorArrayIndex = 0;
        // sensorNames.forEach((sensor) => {
          this._streams.forEach((stream) => {
            const offset = (arrayIndex * this.imageSize) + (sensorArrayIndex * this.timeSteps);
            // console.log(`            offset=${offset} sensor=${sensor} axis=${axis}`);
            this.bigFatDataArray.set(example[stream], offset);
            // next sensor stream
            sensorArrayIndex++;
          });
        // });
        // next complete gesture example
        arrayIndex++;
      });
    });

    // Now we have all the examples and labels in byte arrays. Training and testing involves
    // quickly getting arrays of the data and labels. To speed this up, randomize and combine
    // arrays into two big array buffers, testing and training.
    // Providing training/test arrays will be just selecting from the right shuffled indices
    // and copying the data buffers

    const allExampleIndicesShuffled = tf.util.createShuffledIndices(totalExampleCount);
    const numExamplesTraining = Math.floor(proportionTrainingSamples * totalExampleCount);
    // const numExamplesTesting = totalExampleCount - numExamplesTraining;
    this.trainingIndices = allExampleIndicesShuffled.slice(0, numExamplesTraining);
    this.testingIndices = allExampleIndicesShuffled.slice(numExamplesTraining);

    // console.log('this.trainingIndices', this.trainingIndices);
    // console.log('this.testingIndices', this.testingIndices);
    // this.trainImages = new Float32Array(numExamplesTraining * this.imageSize);
    // this.trainLabels = new Uint8Array(numExamplesTraining * this.numClasses);
    // this.testImages = new Float32Array(numExamplesTesting * this.imageSize);
    // this.testLabels = new Uint8Array(numExamplesTesting * this.numClasses);
    // for (let i = 0; i < this.dataArrays.length; i++) {
    //   const label = new Uint8Array(this.numClasses);
    //   label[]
    // }
    


    // //TODO I NEED THESE FOR THE FUNCTIONS BELOW
    
    // //Done
    // // this.datasetLabels = new Uint8Array(await labelsResponse.arrayBuffer());
    // console.log(`this.datasetLabels=${this.datasetLabels}`);
    
    // const indicesTraining = allExampleIndicesShuffled.slice(0, numExamplesTraining);
    // const indicesTesting = allExampleIndicesShuffled.slice(numExamplesTraining);
    // this.trainIndices = indicesTraining;
    // this.testIndices = indicesTesting;

    // // Create shuffled indices into the train/test set for when we select a
    // // random dataset element for training / validation.
    // this.trainIndices = tf.util.x  (NUM_TRAIN_ELEMENTS);
    // this.testIndices = tf.util.createShuffledIndices(NUM_TEST_ELEMENTS);
    //DONE ABOVE
    // // Slice the the images and labels into train and test sets.
    // this.trainImages =
    //     this.datasetImages.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
    // this.testImages = this.datasetImages.slice(IMAGE_SIZE * NUM_TRAIN_ELEMENTS);
    // this.trainLabels =
    //     this.datasetLabels.slice(0, NUM_CLASSES * NUM_TRAIN_ELEMENTS);
    // this.testLabels =
    //     this.datasetLabels.slice(NUM_CLASSES * NUM_TRAIN_ELEMENTS);
  }
}