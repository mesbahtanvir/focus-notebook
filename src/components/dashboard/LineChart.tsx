import { memo, useCallback, useMemo } from "react";

export interface LineChartDatum {
  date: Date;
  value: number | null;
}

export interface LineChartProps {
  data: LineChartDatum[];
  color: string;
  maxValue?: number;
}

const width = 600;
const height = 200;
const padding = 40;

const LineChartComponent = ({ data, color, maxValue }: LineChartProps) => {
  const validData = useMemo(
    () => data.filter((d): d is { date: Date; value: number } => d.value !== null && !Number.isNaN(d.value)),
    [data]
  );

  const computedMax = useMemo(() => {
    if (validData.length === 0) {
      return 0;
    }
    return maxValue ?? Math.max(...validData.map((d) => d.value));
  }, [maxValue, validData]);

  const range = useMemo(() => {
    const min = 0;
    return computedMax - min;
  }, [computedMax]);

  const dataLength = data.length;

  const xScale = useCallback(
    (index: number) => {
      if (dataLength === 1) return width / 2;
      return padding + (index / Math.max(dataLength - 1, 1)) * (width - 2 * padding);
    },
    [dataLength]
  );

  const yScale = useCallback(
    (value: number) => {
      const min = 0;
      if (range === 0) return height / 2;
      const normalized = (value - min) / range;
      if (Number.isNaN(normalized)) return height / 2;
      return height - padding - normalized * (height - 2 * padding);
    },
    [range]
  );

  const points = useMemo(
    () =>
      data
        .map((datum, index) => {
          if (datum.value === null) return null;
          const x = xScale(index);
          const y = yScale(datum.value);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          return `${x},${y}`;
        })
        .filter(Boolean)
        .join(" "),
    [data, xScale, yScale]
  );

  if (validData.length === 0) {
    return <div className="flex items-center justify-center h-[200px] text-muted-foreground">No data available</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = height - padding - ratio * (height - 2 * padding);
        const labelValue = ratio * computedMax;
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
              {Number.isFinite(labelValue) ? labelValue.toFixed(1) : "0"}
            </text>
          </g>
        );
      })}

      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {data.map((datum, index) => {
        if (datum.value === null) return null;
        const cx = xScale(index);
        const cy = yScale(datum.value);
        if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
        return <circle key={index} cx={cx} cy={cy} r="4" fill={color} />;
      })}
    </svg>
  );
};

export const LineChart = memo(LineChartComponent);

export default LineChart;
