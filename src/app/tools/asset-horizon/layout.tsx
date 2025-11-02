import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function AssetHorizonToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="asset-horizon">{children}</ToolAccessGate>;
}
