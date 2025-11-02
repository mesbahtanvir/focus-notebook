import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function ThoughtsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="thoughts">{children}</ToolAccessGate>;
}
