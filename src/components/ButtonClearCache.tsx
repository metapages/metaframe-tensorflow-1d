import { h, FunctionalComponent } from "preact";
import { useCallback, useEffect } from "preact/hooks";
import { Button } from "@chakra-ui/react";
import { useStore } from "../store";

export const ButtonClearCache: FunctionalComponent = () => {
  const modelCount = useStore((state) => state.modelCount);
  const updateModels = useStore((state) => state.updateModels);
  const deleteAllModels = useStore((state) => state.deleteModels);

  const onClick = useCallback(async () => {
    deleteAllModels();
  }, [deleteAllModels]);

  // update the model count on load
  useEffect(() => {
    (async () => {
      await updateModels();
    })();
  }, [updateModels]);

  return (
    <Button isDisabled={modelCount <= 0} onClick={onClick}>
      Clear cache ({modelCount > 0 ? modelCount : 0} models)
    </Button>
  );
};
