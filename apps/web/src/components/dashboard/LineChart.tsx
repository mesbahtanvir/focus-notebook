"use client";

import { memo, useCallback, useMemo, useState } from "react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 dark:text-gray-400">
        <svg className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const hoveredDatum = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative">
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
          const isHovered = index === hoveredIndex;
          return (
            <g key={index}>
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? "6" : "4"}
                fill={color}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Invisible larger circle for easier hovering */}
              <circle
                cx={cx}
                cy={cy}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredDatum && hoveredDatum.value !== null && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap z-10">
          <div className="font-semibold">
            {hoveredDatum.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div>{hoveredDatum.value.toFixed(1)}</div>
        </div>
      )}
    </div>
  );
};

export const LineChart = memo(LineChartComponent);

export default LineChart;
