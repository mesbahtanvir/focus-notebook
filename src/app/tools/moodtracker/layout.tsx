import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function MoodTrackerToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="moodtracker">{children}</ToolAccessGate>;
}
