import { ReactNode } from "react";
import { ToolAccessGate } from "@/components/tools";

export default function ProjectsToolLayout({ children }: { children: ReactNode }) {
  return <ToolAccessGate toolId="projects">{children}</ToolAccessGate>;
}
