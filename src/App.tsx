import { h, FunctionalComponent } from "preact";
import { useEffect } from "preact/hooks";
import { useMetaframe } from "@metapages/metaframe-hook";
import { Home } from "./routes/home";
import { PredictionInputEncoded, TrainingDataSet } from "./lib/metaframe";
import { useStore, MessagePayload } from "./store";

export const App: FunctionalComponent = () => {

  // Wire up the metaframe to the store
  const metaframeObject = useMetaframe();
  const setTrainingDataSet = useStore((state) => state.setTrainingDataSet);
  const setPredictionInput = useStore((state) => state.setPredictionInput);
  useEffect(() => {
    if (!metaframeObject.metaframe) {
      return;
    }
    const disposers: (()=>void)[] = [];
    disposers.push(metaframeObject.metaframe.onInput("training", (training : TrainingDataSet) => {
      if (training) {
        setTrainingDataSet(training);
      }
    }));

    disposers.push(metaframeObject.metaframe.onInput("prediction", (predictionInput : PredictionInputEncoded) => {
      if (predictionInput) {
        setPredictionInput(predictionInput);
      }
    }));

    return () => {
      while(disposers.length > 0) disposers.pop()();
    }
  }, [metaframeObject.metaframe, setTrainingDataSet]);
  
  return <Home />;
};
