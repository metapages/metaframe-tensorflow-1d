import { h, FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useMetaframe, useHashParamBoolean } from "@metapages/metaframe-hook";
import objectHash from "object-hash";
import * as tf from "@tensorflow/tfjs";
import { ButtonClearCache } from "../../components/ButtonClearCache";
import { TrainingDataPoint, TrainingDataSet } from "../../lib/metaframe";
import { TrainingData } from "../../lib/TrainingData";
import { Trainer } from "../../lib/Trainer";
import { useStore, MessagePayload } from "../../store";
import { modelToJson } from "../../lib/io";
import {
  PersistedModel,
  PersistedModelJson,
  PersistedModelMetadata,
} from "../../lib/types";
import localForage from "localforage";

const id = "test";

const DEBUG_CACHE_TRAINING_DATA = false;

export const TabMetaframeTraining: FunctionalComponent = () => {
  const metaframeObject = useMetaframe();
  const [nocache] = useHashParamBoolean("nocache");
  const [trainingDataSet, setTrainingDataSet] = useState<
    TrainingDataSet | undefined
  >(undefined);

  const [currentlyTrainingDataHash, setCurrentlyTrainingDataHash] =
    useState<string>("");
  const setModel = useStore((state) => state.setModel);
  const model = useStore((state) => state.model);

  // DEBUGGING load test data set if available
  useEffect(() => {
    if (!DEBUG_CACHE_TRAINING_DATA) {
      return;
    }
    (async () => {
      const trainingDataSet: TrainingDataSet | null = await localForage.getItem(
        `TrainingDataSet${id}`
      );
      if (trainingDataSet) {
        setTrainingDataSet(trainingDataSet);
      }
    })();
  }, [setTrainingDataSet]);

  // update the trainingDataSet if a new (hashed to check) arrives
  useEffect(() => {
    const incomingTrainingData = metaframeObject?.inputs["training"];
    if (incomingTrainingData && incomingTrainingData !== setTrainingDataSet) {
      const incomingHash = objectHash(incomingTrainingData);
      if (incomingHash !== currentlyTrainingDataHash) {
        setCurrentlyTrainingDataHash(incomingHash);
        setTrainingDataSet(incomingTrainingData);
      }

      // Degbugging
      if (DEBUG_CACHE_TRAINING_DATA) {
        localForage.setItem(`TrainingDataSet${id}`, incomingTrainingData);
      }
    }
  }, [
    metaframeObject.inputs,
    currentlyTrainingDataHash,
    setCurrentlyTrainingDataHash,
    setTrainingDataSet,
  ]);

  const updateModels = useStore((state) => state.updateModels);
  const setMessages = useStore((state) => state.setMessages);
  // triggered on a new trainingDataSet: train a new model
  useEffect(() => {
    if (!trainingDataSet || !trainingDataSet.examples || trainingDataSet.examples.length === 0 || !metaframeObject?.setOutputs) {
      return;
    }

    const messageHeader: MessagePayload = {
      message: "Training",
      type: "info",
    };

    const keys = Object.keys(trainingDataSet.examples.reduce<Record<string, boolean>>((map, current) => {
      map[current.label] = true;
      return map;
    }, {}));

    if (keys.length < 2) {
      const messageNotEnoughLabels: MessagePayload = {
        message: `Not enough data labels: [${keys.join(", ")}]`,
        type: "warning",
      };
      setMessages([messageHeader, messageNotEnoughLabels]);
      return;
    }

    let cancelled = false;

    (async () => {

      const messageLoading: MessagePayload = {
        message: "loading data...",
        type: "info",
      };
      setMessages([messageHeader, messageLoading]);

      // ? shut down any existing objects to free memory/resources, or they just get GC'd
      const trainingData = new TrainingData(trainingDataSet);
      await trainingData.load();
      if (cancelled) {
        return;
      }
      const messageLoaded: MessagePayload = {
        message: "✅ loaded data",
        type: "info",
      };
      setMessages([messageHeader, messageLoaded]);

      const hash = trainingData.hash();

      const meta: PersistedModelMetadata = {
        prediction: {
          classNames: trainingData.classNames,
          imageHeight: trainingData.imageHeight,
          imageWidth: trainingData.imageWidth,
          maxAbsoluteRawValue: trainingData._maxAbsoluteValue,
        },
        training: {
          date: new Date(),
          trainingDataHash: hash,
        },
      };

      let model: PersistedModel;
      // check if we have a cached tensorflow model saved locally
      // const loadedModel = await tf.loadModel('indexeddb://my-model-1');
      if (!nocache) {
        const allModels = await tf.io.listModels();
        if (cancelled) {
          return;
        }
        if (allModels[`indexeddb://${hash}`]) {
          const loadedModel = await tf.loadLayersModel(`indexeddb://${hash}`);
          if (cancelled) {
            return;
          }

          model = {
            model: loadedModel,
            meta: meta,
          };

          setMessages([
            messageHeader,
            { message: `Model ready (cached) ${hash.substr(0, 10)}`, type: "success" },
          ]);
          setModel(model);
          return;
        }
      }

      setMessages([messageHeader, { message: "training...", type: "warning" }]);
      const trainer = new Trainer(trainingData);
      await trainer.train();
      if (cancelled) {
        return;
      }
      setMessages([messageHeader, { message: "✅ Trained", type: "warning" }]);

      model = {
        model: trainer.model,
        meta: meta,
      };

      if (!nocache) {
        await model.model.save(`indexeddb://${hash}`);
        updateModels();
      }

      setModel(model);
      const persistedModelJson = await modelToJson(model);
      metaframeObject.setOutputs!({ model: persistedModelJson });

      setMessages([
        messageHeader,
        { message: `✅ Model ready ${hash.substr(0, 10)}`, type: "success" },
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [trainingDataSet, nocache, setModel, metaframeObject?.setOutputs]);

  useEffect(() => {
    if (model && metaframeObject?.setOutputs) {
      (async () => {
        const modelDehydrated:PersistedModelJson = await modelToJson(model);
        metaframeObject.setOutputs!({model:modelDehydrated});
      })();
    }
  }, [model, metaframeObject?.setOutputs])

  /* id="Training" is consumed by Trainer */
  return (
    <div>
      <ButtonClearCache />
      <div id="Training" />
    </div>
  );
};
