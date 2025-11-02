import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function InvestmentsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="investments">{children}</ToolAccessGate>;
}
