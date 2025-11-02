import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function RelationshipsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="relationships">{children}</ToolAccessGate>;
}
