"use client";

import Link from "next/link";
import { memo, ReactNode } from "react";
import { motion } from "framer-motion";

export interface DashboardLinkProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  gradient: string;
}

const DashboardLinkComponent = ({ title, description, icon, href, gradient }: DashboardLinkProps) => (
  <Link href={href}>
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer`}
    >
      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${gradient} text-white mb-4 shadow-lg`}>{icon}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
    </motion.div>
  </Link>
);

export const DashboardLink = memo(DashboardLinkComponent);

export default DashboardLink;
