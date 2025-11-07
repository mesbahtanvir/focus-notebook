"use client";

import { memo } from "react";

export interface CategoryDataPoint {
  date: Date;
  total: number;
  mastery: number;
  pleasure: number;
}

export interface StackedCategoryChartProps {
  data: CategoryDataPoint[];
}

const StackedCategoryChartComponent = ({ data }: StackedCategoryChartProps) => {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No data available</div>;
  }

  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const width = 600;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const barWidth = chartWidth / data.length;

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <text
                x={padding.left - 5}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-current text-muted-foreground"
              >
                {Math.round(maxValue * ratio)}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {data.map((point, index) => {
          const x = padding.left + index * barWidth;
          const masteryHeight = (point.mastery / maxValue) * chartHeight;
          const pleasureHeight = (point.pleasure / maxValue) * chartHeight;
          const masteryY = padding.top + chartHeight - masteryHeight - pleasureHeight;
          const pleasureY = padding.top + chartHeight - pleasureHeight;

          return (
            <g key={index}>
              {/* Mastery (blue) - bottom layer */}
              <rect
                x={x + barWidth * 0.2}
                y={masteryY}
                width={barWidth * 0.6}
                height={masteryHeight}
                className="fill-blue-500"
                opacity={0.8}
              />
              {/* Pleasure (purple) - top layer */}
              <rect
                x={x + barWidth * 0.2}
                y={pleasureY}
                width={barWidth * 0.6}
                height={pleasureHeight}
                className="fill-purple-500"
                opacity={0.8}
              />
              {/* Date label */}
              {(data.length <= 7 || index % Math.ceil(data.length / 7) === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-xs fill-current text-muted-foreground"
                >
                  {formatDate(point.date)}
                </text>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${width - 120}, ${padding.top})`}>
          <rect x={0} y={0} width={12} height={12} className="fill-blue-500" opacity={0.8} />
          <text x={16} y={10} className="text-xs fill-current text-muted-foreground">
            Mastery
          </text>
          <rect x={0} y={18} width={12} height={12} className="fill-purple-500" opacity={0.8} />
          <text x={16} y={28} className="text-xs fill-current text-muted-foreground">
            Pleasure
          </text>
        </g>
      </svg>
    </div>
  );
};

export const StackedCategoryChart = memo(StackedCategoryChartComponent);

export default StackedCategoryChart;
