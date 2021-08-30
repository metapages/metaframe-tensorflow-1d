import { render } from "preact";
import { WithMetaframe } from "@metapages/metaframe-hook";
import { ChakraProvider } from "@chakra-ui/react";
import { App } from "./App";
import localForage from "localforage";

localForage.config({
  driver: localForage.INDEXEDDB,
  name: "metaframe-predictor",
  version: 1.0,
  storeName: "models", // Should be alphanumeric, with underscores.
  description: "Stores tensorflow models locally",
});

render(
  <ChakraProvider>
    <WithMetaframe>
      <App />
    </WithMetaframe>
  </ChakraProvider>,
  document.getElementById("root")!
);
