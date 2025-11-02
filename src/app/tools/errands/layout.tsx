import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function ErrandsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="errands">{children}</ToolAccessGate>;
}
