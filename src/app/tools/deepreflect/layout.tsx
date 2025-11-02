import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function DeepReflectToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="deepreflect">{children}</ToolAccessGate>;
}
