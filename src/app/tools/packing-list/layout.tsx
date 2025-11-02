import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function PackingListToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="packing-list">{children}</ToolAccessGate>;
}
