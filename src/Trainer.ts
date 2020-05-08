/**
 * @license
 * Private wand license.
 */

import {TrainingData} from './TrainingData';
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';

// import { Drawable } from '@tensorflow/tfjs-vis';

const BATCH_SIZE = 32;
const EPOCHS = 10;

export class Trainer {
    _data:TrainingData;
    _model:any;
    classNames :string[] = [];

  constructor(data:TrainingData) {
    this._data = data;
    this.createModel();
  }

  get model() {
    return this._model;
  }

  createModel() {
    const data = this._data;
    this.classNames = data.classNames;
    // const filters1 = 64; // 100
    // const filters2 = 10; // 160
    // const kernelSize = 10; // 100
    this._model = tf.sequential();
    // this._model = tf.sequential({
    //   layers: [
    //     tf.layers.conv1d({ kernelSize: 10, filters: filters1, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [data.imageWidth, data.imageHeight] }),
    //     tf.layers.conv1d({ kernelSize: 10, filters: filters1, strides: 1, activation: 'relu' }),
    //     tf.layers.maxPooling1d({poolSize:3}),
    //     tf.layers.conv1d({ kernelSize: 10, filters: filters2, strides: 1, activation: 'relu' }),
    //     tf.layers.conv1d({ kernelSize: 10, filters: filters2, strides: 1, activation: 'relu' }),
    //     tf.layers.globalAveragePooling1d(),
    //     tf.layers.dropout({rate:0.5}),

        // Now we flatten the output from the 2D filters into a 1D vector to prepare
        // it for input into our last layer. This is common practice when feeding
        // higher dimensional data to a final classification output layer.
        // tf.layers.flatten(),

    //     // Our last layer is a dense layer which has 1 output unit for each "gesture" including the null gesture
    //     tf.layers.dense({ units: data.numClasses,  activation: 'softmax' }),// kernelInitializer: 'varianceScaling',
    //   ]
    // });

    // const width = data.imageWidth;
    // const height = data.imageHeight;
    // console.log('width', width);
    // console.log('height', height);

    this._model.add(tf.layers.conv1d({ filters: 100, kernelSize: 7, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [data.height, data.width] }));//, batchSize: BATCH_SIZE
    this._model.add(tf.layers.conv1d({ filters: 100, kernelSize: 7, strides: 1, activation: 'relu' }));
    this._model.add(tf.layers.conv1d({ filters: 100, kernelSize: 7, strides: 1, activation: 'relu' }));
    this._model.add(tf.layers.maxPooling1d({poolSize:3}));
    this._model.add(tf.layers.conv1d({ filters: 100, kernelSize: 7, strides: 1, activation: 'relu' }));
    // this._model.add(tf.layers.conv1d({ filters: 64, kernelSize: 7, strides: 1, activation: 'relu' }));
    this._model.add(tf.layers.globalAveragePooling1d());
    this._model.add(tf.layers.dropout({rate:0.5}));

    // Now we flatten the output from the 2D filters into a 1D vector to prepare
    // it for input into our last layer. This is common practice when feeding
    // higher dimensional data to a final classification output layer.
    tf.layers.flatten(),

    // Our last layer is a dense layer which has 1 output unit for each "gesture" including the null gesture
    this._model.add(tf.layers.dense({ units: data.classNames.length, activation: 'softmax' }));// kernelInitializer: 'varianceScaling',
  
  
    this._model.summary();

    // Choose an optimizer, loss function and accuracy metric,
    // then compile and return the model
    const optimizer = tf.train.adam();
    this._model.compile({
        optimizer: optimizer,
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
    });

    return this._model;
  }

  async train() {
    const data = this._data;
    const metrics = ['loss', 'val_loss', 'acc', 'val_acc'];
    // const container = {
    //     name: 'Model Training', styles: { height: '1000px' }
    // };
    const container = document.getElementById('Training') as any;
    const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);

    // const TRAIN_DATA_SIZE = 120;
    // const TEST_DATA_SIZE = 120;

    // const totalExamples = data.trainingExampleCount

    const trainingDataSize = data.trainingExampleCount * 2;
    const [trainXs, trainYs] = tf.tidy(() => {
        const d = data.nextTrainBatch(trainingDataSize);
        return [
          // d.xs.reshape([TRAIN_DATA_SIZE, data.imageWidth, data.imageHeight, 1]),
          // d.xs.reshape([TRAIN_DATA_SIZE, data.imageHeight, data.imageWidth, 1]),
          d.xs.reshape([trainingDataSize, data.imageHeight, data.imageWidth]),
          d.labels
        ];
    });

    // console.log('trainXs', trainXs);
    // console.log('trainYs', trainYs);
    
    const testingDataSize = data.testingExampleCount * 2;
    const [testXs, testYs] = tf.tidy(() => {
        const d = data.nextTestBatch(testingDataSize);
        return [
          // d.xs.reshape([TEST_DATA_SIZE, data.imageWidth, data.imageHeight, 1]),
          // d.xs.reshape([TRAIN_DATA_SIZE, data.imageHeight, data.imageWidth, 1]),
          d.xs.reshape([testingDataSize, data.imageHeight, data.imageWidth]),
          d.labels
        ];
    });

    const m = await this.model.fit(trainXs, trainYs, {
        batchSize: BATCH_SIZE,
        validationData: [testXs, testYs],
        epochs: EPOCHS,
        shuffle: true,
        callbacks: fitCallbacks
    });

    // tfvis.show.modelSummary(container, m);
    return m;
  }
}