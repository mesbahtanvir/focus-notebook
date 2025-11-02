import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function FocusToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="focus">{children}</ToolAccessGate>;
}
