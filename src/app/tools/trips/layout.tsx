import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function TripsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="trips">{children}</ToolAccessGate>;
}
