import { h, FunctionalComponent } from "preact";
import { AlignedData, Options } from "uplot";
import "uplot/dist/uPlot.min.css";
import UplotReact from "uplot-react";
import { SensorJson } from "../../lib/TrainingData";

export const DataExamplePlot: FunctionalComponent<{ example: SensorJson }> = ({
  example,
}) => {
  const keys = Object.keys(example.data);

  const data: AlignedData = [
    Array.from(Array(example.data[keys[0]].length).keys()),
    ...keys.map((k) => Array.from((example.data as any)[k]) as number[]),
  ];

  const options: Options = {
    width: 400,
    height: 100,
    // class: "spark",
    pxAlign: false,
    cursor: {
      show: false,
    },
    legend: {
      show: false,
    },
    scales: {
      x: {
        time: false,
      },
    },
    axes: [
      {
        show: false,
      },
      {
        show: false,
      },
    ],
    series: [
      {},
      {
        stroke: "#FF6D6D",
      },
      {
        stroke: "#FFA56D",
      },
      {
        stroke: "#D5B93B",
      },
      {
        stroke: "#8089FF",
      },
      {
        stroke: "#AA80FF",
      },
      {
        stroke: "#80BFFF",
      },
    ],
  };

  return (
    <div>
      <UplotReact options={options} data={data} />
    </div>
  );
};
