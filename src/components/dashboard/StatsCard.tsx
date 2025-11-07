"use client";

import { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
  comparison?: number | null; // Percentage change from previous period
}

const StatsCardComponent = ({ icon, title, value, subtitle, gradient, comparison }: StatsCardProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${gradient} text-white mb-4`}>{icon}</div>
    <div className="text-sm text-muted-foreground">{title}</div>
    <div className="flex items-baseline gap-2 mt-1">
      <div className="text-3xl font-bold">{value}</div>
      {comparison !== null && comparison !== undefined && comparison !== 0 && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            comparison > 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {comparison > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{Math.abs(comparison).toFixed(0)}%</span>
        </div>
      )}
    </div>
    <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
  </motion.div>
);

export const StatsCard = memo(StatsCardComponent);

export default StatsCard;
