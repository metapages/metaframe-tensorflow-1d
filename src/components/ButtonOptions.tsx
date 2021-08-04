import { h, FunctionalComponent } from "preact";
import { Option, OptionsMenuButton } from "@metapages/metaframe-ui-widgets";

const appOptions: Option[] = [
  {
    name: "nocache",
    displayName: "Disable caching",
    type: "boolean",
    default: false,
  },
  {
    name: "hide_auto_help",
    displayName: "Hide automatic help",
    type: "boolean",
    default: false,
  },
];

// wish I could extract this from Option[]
export type OptionBlob = {
  nocache?: boolean;
  hide_auto_help?: boolean;
};

export const ButtonOptions: FunctionalComponent = () => {
  return <OptionsMenuButton options={appOptions} />;
};
