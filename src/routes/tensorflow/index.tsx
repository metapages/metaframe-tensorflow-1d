import { h, FunctionalComponent } from "preact";
import {
  Box,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Spacer,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  useColorModeValue,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { ButtonOptions } from "../../components/ButtonOptions";
import { ButtonHelp } from "../../components/ButtonHelp";
import { TabMetaframeTraining } from "./TabMetaframeTraining";
import { TabMetaframePrediction } from "./TabMetaframePrediction";
import { useHashParamInt } from "@metapages/metaframe-hook";
import { Messages } from "../../components/Messages";
import { TabVisualizeTrainingData } from './TabVisualizeTrainingData';

export const TensorFlowRoute: FunctionalComponent = () => {
  const colors = useColorModeValue(
    ["red.50", "teal.50", "blue.50"],
    ["red.900", "teal.900", "blue.900"]
  );
  const [index, setIndex] = useHashParamInt("tab", 0);
  const bg = colors[index!];

  return (
    <SimpleGrid columns={1} spacing={10}>
      <Flex>
        <Heading size="md">
          <Link href="https://www.tensorflow.org/js" isExternal mr="2">
            <ExternalLinkIcon /> Tensorflow 1D
          </Link>
          convolutional neural net trainer/predictor
        </Heading>
        <Spacer />
        <ButtonHelp />
        <ButtonOptions />
      </Flex>
      <Flex>
        <Messages />
      </Flex>
      <Box>
        <Tabs isLazy={true} isFitted={true} onChange={setIndex} bg={bg}>
          <TabList>
            <Tab>Visualize training</Tab>
            <Tab>Train</Tab>
            <Tab>Predict</Tab>
          </TabList>
          <TabPanels p="1rem">
            <TabPanel>
              <TabVisualizeTrainingData />
            </TabPanel>
            <TabPanel>
              <TabMetaframeTraining />
            </TabPanel>
            <TabPanel>
              <TabMetaframePrediction />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </SimpleGrid>
  );
};
