import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function GoalsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="goals">{children}</ToolAccessGate>;
}
