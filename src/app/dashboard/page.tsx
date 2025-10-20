"use client";

import SummaryPanel from "@/components/SummaryPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 md:py-8 space-y-6 px-4 md:px-0">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full">
            <BarChart3 className="h-10 w-10 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
          📊 Dashboard
        </h1>
        <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
          Overview of your day at a glance
        </p>
      </div>

      {/* Dashboard Card */}
      <Card className="border-4 border-blue-200 shadow-xl bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 border-b-4 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                📈 Your Progress
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium text-sm md:text-base">
                Track your journey and achievements
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <SummaryPanel />
        </CardContent>
      </Card>
    </div>
  );
}
