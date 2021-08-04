import create from "zustand";
import * as tf from "@tensorflow/tfjs";
import {

  AlertStatus,
} from "@chakra-ui/react";
import {
  PredictionResult,
} from "./lib/metaframe";
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
  prediction: PredictionResult | undefined;
  currentlyTrainingDataHash: string | null;
  clearMessages: () => void;
  addMessage: (message: MessagePayload) => void;
  setMessages: (messages: MessagePayload[]) => void;
  setTrainingDataHash: (hash: string | null) => void;
  updateModels: () => Promise<void>;
  deleteModels: () => void;
  setModel: (model: PersistedModel) => void;
  setPrediction: (prediction: PredictionResult | undefined) => void;
};

export const useStore = create<StoreState>(set => ({
  messages: [],
  modelCount: -1,
  model: undefined,
  prediction: undefined,
  currentlyTrainingDataHash: null,
  clearMessages: () => set((state) => ({ messages: [] })),
  addMessage: (message: MessagePayload) =>
    set((state) => ({ messages: state.messages.concat([message]) })),
  setMessages: (messages: MessagePayload[]) => set((state) => ({ messages })),
  setTrainingDataHash: (hash: string | null) =>
    set((state) => ({ currentlyTrainingDataHash: hash })),

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
  setPrediction: async (prediction: PredictionResult | undefined) => {
    set((state) => ({ prediction }));
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
