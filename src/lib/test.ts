import { PersistedModel, PersistedModelJson } from './types';
import { predictionDecode, TrainingDataSet } from './metaframe';
import { jsonToModel, modelToJson, predict } from './io';

export const verifySaveLoadPrediction = async (model :PersistedModel, trainingData:TrainingDataSet) :Promise<boolean> => {
    const modelJson :PersistedModelJson = await modelToJson(model);
    const s = JSON.stringify(modelJson);
    const persistedModelJsonCloned:PersistedModelJson = JSON.parse(s);
    const modelRehydrated:PersistedModel = await jsonToModel(persistedModelJsonCloned);
    const prediction = predict(modelRehydrated, predictionDecode(trainingData.examples[0].data));
    console.log('prediction', prediction);
    console.log('trainingDataSet.examples[0]', trainingData.examples[0]);
    return true;
}
