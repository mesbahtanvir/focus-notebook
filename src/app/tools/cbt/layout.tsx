import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function CBTToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="cbt">{children}</ToolAccessGate>;
}
