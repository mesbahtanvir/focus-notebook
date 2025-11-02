import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function NotesToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="notes">{children}</ToolAccessGate>;
}
