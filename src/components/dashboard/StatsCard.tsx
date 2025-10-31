"use client";

import { memo, ReactNode } from "react";
import { motion } from "framer-motion";

export interface StatsCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
}

const StatsCardComponent = ({ icon, title, value, subtitle, gradient }: StatsCardProps) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${gradient} text-white mb-4`}>{icon}</div>
    <div className="text-sm text-muted-foreground">{title}</div>
    <div className="text-3xl font-bold mt-1">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
  </motion.div>
);

export const StatsCard = memo(StatsCardComponent);

export default StatsCard;
