"use client";

import { memo } from "react";
import { Smile, Zap, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard";

import LineChart from "./LineChart";
import StackedAreaChart from "./StackedAreaChart";

export interface DashboardChartsProps {
  moodData: DashboardAnalytics["moodData"];
  focusData: DashboardAnalytics["focusData"];
  taskData: DashboardAnalytics["taskData"];
}

const DashboardChartsComponent = ({ moodData, focusData, taskData }: DashboardChartsProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-yellow-500" />
          Mood Trends
        </CardTitle>
        <CardDescription>Average daily mood over time</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart data={moodData} color="#f59e0b" maxValue={10} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-500" />
          Focus Session Time
        </CardTitle>
        <CardDescription>Minutes spent in focus mode</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart data={focusData.map((datum) => ({ date: datum.date, value: datum.minutes }))} color="#a855f7" />
      </CardContent>
    </Card>

    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Task Completion Trend
        </CardTitle>
        <CardDescription>Daily tasks completed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <StackedAreaChart data={taskData} />
      </CardContent>
    </Card>
  </div>
);

export const DashboardCharts = memo(DashboardChartsComponent);

export default DashboardCharts;
