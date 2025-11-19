"use client";

import { toast } from "@/hooks/use-toast";
import type { ToastActionElement } from "@/components/ui/toast";

type ToastInput = {
  title?: string;
  description: string;
  action?: ToastActionElement;
  duration?: number;
};

const DURATIONS = {
  short: 3500,
  medium: 6000,
  long: 8000,
} as const;

export const toastSuccess = (input: ToastInput) => {
  const { duration, ...rest } = input;
  return toast({
    duration: duration ?? DURATIONS.short,
    ...rest,
  });
};

export const toastError = (input: ToastInput) => {
  const { title, duration, ...rest } = input;
  return toast({
    title: title ?? "Something went wrong",
    duration: duration ?? DURATIONS.medium,
    variant: "destructive",
    ...rest,
  });
};

export const toastInfo = (input: ToastInput) => {
  const { duration, ...rest } = input;
  return toast({
    duration: duration ?? DURATIONS.medium,
    ...rest,
  });
};

export const toastWarning = (input: ToastInput) => {
  const { title, duration, ...rest } = input;
  return toast({
    title: title ?? "Check this",
    duration: duration ?? DURATIONS.medium,
    ...rest,
  });
};

export const TOAST_DURATIONS = DURATIONS;
