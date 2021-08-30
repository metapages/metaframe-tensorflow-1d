import { FunctionalComponent } from "preact";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  ListItem,
  Stack,
  UnorderedList,
} from "@chakra-ui/react";
import { useStore } from "../store";

export const Messages: FunctionalComponent = () => {
  const messages = useStore((state) => state.messages);
  return (
    <Stack spacing={3}>
      {messages.map((m, i) => (
        <Alert key={i} status={m.type ? m.type : "info"}>
          <AlertTitle mr={2}>{m.message}</AlertTitle>
          <AlertIcon />
          <AlertDescription>
            <UnorderedList>
              {!m.messages
                ? null
                : m.messages.map((mItem, j) => (
                    <ListItem key={j}>{mItem}</ListItem>
                  ))}
            </UnorderedList>
          </AlertDescription>
        </Alert>
      ))}
    </Stack>
  );
};
