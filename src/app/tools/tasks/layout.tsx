import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function TasksToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="tasks">{children}</ToolAccessGate>;
}
