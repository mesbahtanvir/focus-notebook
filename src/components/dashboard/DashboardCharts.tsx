"use client";

import { memo } from "react";
import { Zap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard";

import LineChart from "./LineChart";

export interface DashboardChartsProps {
  focusData: DashboardAnalytics["focusData"];
  taskData: DashboardAnalytics["taskData"];
}

const DashboardChartsComponent = ({ focusData }: DashboardChartsProps) => (
  <div className="grid gap-6">
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
  </div>
);

export const DashboardCharts = memo(DashboardChartsComponent);

export default DashboardCharts;
