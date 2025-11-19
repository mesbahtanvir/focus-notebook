"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorCalloutProps = {
  title?: string;
  message: string;
  action?: ReactNode;
  tone?: "default" | "destructive" | "info";
  className?: string;
};

const toneClasses: Record<NonNullable<ErrorCalloutProps["tone"]>, string> = {
  default: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200",
  destructive: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200",
};

export function ErrorCallout({
  title,
  message,
  action,
  tone = "destructive",
  className,
}: ErrorCalloutProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        toneClasses[tone],
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div className="space-y-1">
        {title && <div className="font-semibold leading-none">{title}</div>}
        <div className="leading-snug">{message}</div>
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
