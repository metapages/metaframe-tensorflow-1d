import { h, FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useMetaframe } from "@metapages/metaframe-hook";
import {
  predictionDecode,
  PredictionInput,
  PredictionInputEncoded,
  PredictionResult,
} from "../../lib/metaframe";
import { useStore } from "../../store";
import { predict } from "../../lib/io";
import {
  Alert,
  AlertIcon,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

export const TabMetaframePrediction: FunctionalComponent = () => {
  const metaframeObject = useMetaframe();
  const model = useStore((state) => state.model);
  const [predictionDataEncoded, setPredictionDataEncoded] = useState<
    PredictionInputEncoded | undefined
  >(undefined);
  const [predictionInput, setPredictionInput] = useState<
    PredictionInput | undefined
  >(undefined);
  const [prediction, setPrediction] = useState<PredictionResult | undefined>(
    undefined
  );

  // console.log(
  //   `TabMetaframePrediction\n model=${
  //     model !== undefined
  //   }\n predictionDataEncoded=${
  //     predictionDataEncoded !== undefined
  //   }\n predictionInput=${
  //     predictionInput !== undefined
  //   }\n prediction=${prediction}`
  // );

  // update the predictionInput on the incoming "prediction" metaframe input pipe
  useEffect(() => {
    const newPredictionData: PredictionInputEncoded =
      metaframeObject?.inputs?.["prediction"];
    if (newPredictionData && newPredictionData !== predictionDataEncoded) {
      setPredictionDataEncoded(newPredictionData);
      const newPredictionInput: PredictionInput =
        predictionDecode(newPredictionData);
      setPredictionInput(newPredictionInput);
    }
  }, [
    metaframeObject.inputs,
    predictionDataEncoded,
    setPredictionDataEncoded,
    setPredictionInput,
  ]);

  // triggered on a new trainingDataSet: train a new model
  useEffect(() => {
    if (!predictionInput || !model || !metaframeObject?.setOutputs) {
      return;
    }

    (async () => {
      const [predictionResult, predictionError] = await predict(
        model,
        predictionInput
      );

      metaframeObject.setOutputs!({
        prediction: predictionResult,
        error: predictionError?.message,
      });
      setPrediction(predictionResult);
    })();
  }, [predictionInput, model, setPrediction, metaframeObject.setOutputs]); //, metaframeObject.setOutputs

  return (
    <div>
      <Alert status={prediction?.prediction ? "success" : "info"}>
        <AlertIcon />
        {prediction ? prediction.prediction : "...waiting for data"}
      </Alert>

      {prediction?.note ? (
        <Alert status="warning">
          <AlertIcon />
          {prediction?.note}
        </Alert>
      ) : null}

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Label</Th>
            <Th>Score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {!prediction
            ? null
            : Object.keys(prediction.predictions)
                .sort((p) => prediction.predictions[p])
                .map((k) => (
                  <Tr>
                    <Td>{k}</Td>
                    <Td isNumeric>{prediction.predictions[k]}</Td>
                  </Tr>
                ))}
        </Tbody>
      </Table>
    </div>
  );
};
