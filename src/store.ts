import create from "zustand";
import * as tf from "@tensorflow/tfjs";
import {
  AlertStatus,
} from "@chakra-ui/react";
import { PredictionResult, TrainingDataSet, PredictionInputEncoded } from './lib/metaframe';
import { PersistedModel } from "./lib/types";

export type MessagePayload = {
  message: string;
  type: AlertStatus;
  messages?: string[];
};


export type StoreState = {
  messages: MessagePayload[];
  modelCount: number;
  model: PersistedModel | undefined;
  trainingDataSet: TrainingDataSet | undefined;
  predictionInput: PredictionInputEncoded | undefined;
  predictionOutput: PredictionResult | undefined;
  currentlyTrainingDataHash: string | null;
  clearMessages: () => void;
  addMessage: (message: MessagePayload) => void;
  setMessages: (messages: MessagePayload[]) => void;
  setTrainingDataSet: (training: TrainingDataSet) => void;
  updateModels: () => Promise<void>;
  deleteModels: () => void;
  setModel: (model: PersistedModel) => void;
  setPredictionInput: (prediction: PredictionInputEncoded) => void;
  setPredictionOutput: (prediction: PredictionResult) => void;
};

export const useStore = create<StoreState>(set => ({
  messages: [],
  modelCount: -1,
  model: undefined,
  trainingDataSet: undefined,
  predictionInput: undefined,
  predictionOutput: undefined,
  currentlyTrainingDataHash: null,
  clearMessages: () => set((state) => ({ messages: [] })),
  addMessage: (message: MessagePayload) =>
    set((state) => ({ messages: state.messages.concat([message]) })),
  setMessages: (messages: MessagePayload[]) => set((state) => ({ messages })),
  setTrainingDataSet: (trainingDataSet: TrainingDataSet) =>
    set((state) => ({ trainingDataSet })),

  updateModels: async () => {
    const count = await getModelCount();
    set((state) => ({ modelCount: count }));
  },
  deleteModels: async () => {
    await deleteAllModels();
    set((state) => ({ modelCount: 0 }));
  },
  setModel: async (model: PersistedModel) => {
    set((state) => ({ model }));
  },
  setPredictionInput: async (predictionInput: PredictionInputEncoded) => {
    set((state) => ({ predictionInput }));
  },
  setPredictionOutput: async (predictionOutput: PredictionResult) => {
    set((state) => ({ predictionOutput }));
  },
}));

const getModelCount = async () => {
  const allModels = await tf.io.listModels();
  return Object.keys(allModels).length;
};

const deleteAllModels = async () => {
  const allModels = await tf.io.listModels();
  const deletions = Object.keys(allModels).map((key) => tf.io.removeModel(key));
  try {
    await Promise.all(deletions);
  } catch (err) {
    console.error(err);
  }
};
