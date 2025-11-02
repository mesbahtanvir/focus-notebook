import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function SubscriptionsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="subscriptions">{children}</ToolAccessGate>;
}
