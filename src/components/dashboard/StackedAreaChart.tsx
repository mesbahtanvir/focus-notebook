import { memo, useCallback, useMemo } from "react";

export interface StackedAreaDatum {
  date: Date;
  total: number;
}

export interface StackedAreaChartProps {
  data: StackedAreaDatum[];
}

const width = 800;
const height = 200;
const padding = 40;

const StackedAreaChartComponent = ({ data }: StackedAreaChartProps) => {
  const hasData = data.length > 0;

  const max = useMemo(() => {
    if (!hasData) {
      return 1;
    }
    return Math.max(...data.map((datum) => datum.total), 1);
  }, [data, hasData]);

  const dataLength = data.length;

  const xScale = useCallback(
    (index: number) => padding + (index / Math.max(dataLength - 1, 1)) * (width - 2 * padding),
    [dataLength]
  );

  const yScale = useCallback((value: number) => height - padding - (value / max) * (height - 2 * padding), [max]);

  const totalPath = useMemo(() => {
    if (!hasData) {
      return "";
    }

    const points = data.map((datum, index) => `L ${xScale(index)} ${yScale(datum.total)}`).join(" ");
    return [`M ${xScale(0)} ${height - padding}`, points, `L ${xScale(dataLength - 1)} ${height - padding}`, "Z"].join(" ");
  }, [data, dataLength, hasData, xScale, yScale]);

  if (!hasData) {
    return <div className="flex items-center justify-center h-[200px] text-muted-foreground">No data available</div>;
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {[0, 0.5, 1].map((ratio) => {
          const y = height - padding - ratio * (height - 2 * padding);
          return (
            <g key={ratio}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity="0.1" />
              <text
                x={padding - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {Math.round(ratio * max)}
              </text>
            </g>
          );
        })}

        <path d={totalPath} fill="#3b82f6" opacity="0.6" />
      </svg>
    </div>
  );
};

export const StackedAreaChart = memo(StackedAreaChartComponent);

export default StackedAreaChart;
