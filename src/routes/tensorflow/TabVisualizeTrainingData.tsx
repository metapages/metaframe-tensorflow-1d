import { h, FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useStore } from "../../store";
import { TrainingData } from "../../lib/TrainingData";
import { DataExamplePlot } from "./DataExamplePlot";
import {
  Alert,
  AlertIcon,
  Heading,
  Table,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  TabProps,
  Td,
  Thead,
  Tr,
  Tbody,
  Tfoot,
  Th,
  TableCaption,
} from "@chakra-ui/react";

export const TabVisualizeTrainingData: FunctionalComponent = () => {
  const trainingDataSet = useStore((state) => state.trainingDataSet);
  const [trainingData, setTrainingData] = useState<TrainingData | undefined>();

  // load
  useEffect(() => {
    if (!trainingDataSet) {
      return;
    }
    let cancelled = false;
    (async () => {
      const trainingDataNew = new TrainingData(trainingDataSet);
      await trainingDataNew.load();
      if (cancelled) {
        return;
      }
      setTrainingData(trainingDataNew);
    })();
    return () => {
      cancelled = true;
    };
  }, [trainingDataSet]);

  // now plot loaded data
  useEffect(() => {
    // trainingData
  }, [trainingData]);

  return (
    <Tabs isLazy={true} orientation={"horizontal"}>
      <TabList>
        {trainingData
          ? trainingData._labels.map((label, index) => (
              <Tab key={index}>{label}</Tab>
            ))
          : []}
      </TabList>
      <TabPanels>
        {trainingData
          ? trainingData._labels.map((label, index) => (
              <TabPanel p={4} key={index}>
                <TabPane label={label} trainingData={trainingData} />
              </TabPanel>
            ))
          : []}
      </TabPanels>
    </Tabs>
  );
};

export const TabPane: FunctionalComponent<{
  label: string;
  trainingData: TrainingData;
}> = ({ label, trainingData }) => {
  const examples = trainingData.allExamplesForLabel(label);
  const streamLabels = examples[0] ? Object.keys(examples[0].data).sort() : [];

  return (
    <div>
      <Heading size="small">Total: {examples.length}</Heading>
      <Table variant="simple">
        {/* <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Name</Th>
            <Th>Created</Th>
            <Th>Delete</Th>
            <Th>Plot</Th>
          </Tr>
        </Thead> */}
        <Tbody>
          {examples.map((example, index) => (
            <Tr key={index}>
              <Td>{example.url}</Td>
              <Td>
                <DataExamplePlot example={example} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
};
