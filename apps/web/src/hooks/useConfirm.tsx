"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { ReactNode } from "react";

type ConfirmVariant = "danger" | "warning" | "info";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
};

/**
 * Lightweight promise-based confirm helper so callers can await the user choice
 * without wiring modal state each time.
 */
export function useConfirm() {
  const [config, setConfig] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<(result: boolean) => void>();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setConfig(options);
    });
  }, []);

  const handleResult = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = undefined;
    setConfig(null);
  }, []);

  const ConfirmDialog = config ? (
    <ConfirmModal
      isOpen
      onConfirm={() => handleResult(true)}
      onCancel={() => handleResult(false)}
      {...config}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
