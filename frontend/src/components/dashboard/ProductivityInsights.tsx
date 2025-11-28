"use client";

import { memo } from "react";
import { Calendar, Clock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAnalytics } from "@/lib/analytics/dashboard";

import TimeOfDayProductivity from "./TimeOfDayProductivity";

export interface ProductivityInsightsProps {
  timeOfDayData: DashboardAnalytics["timeOfDayData"];
}

const ProductivityInsightsComponent = ({ timeOfDayData }: ProductivityInsightsProps) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-500" />
          Productivity by Time of Day
        </CardTitle>
        <CardDescription>When are you most productive?</CardDescription>
      </CardHeader>
      <CardContent>
        <TimeOfDayProductivity data={timeOfDayData} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          Category Breakdown
        </CardTitle>
        <CardDescription>Time distribution across task categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Task categories removed - use tags instead</p>
        </div>
      </CardContent>
    </Card>
  </>
);

export const ProductivityInsights = memo(ProductivityInsightsComponent);

export default ProductivityInsights;
