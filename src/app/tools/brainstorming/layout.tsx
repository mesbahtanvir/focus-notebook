import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function BrainstormingToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="brainstorming">{children}</ToolAccessGate>;
}
