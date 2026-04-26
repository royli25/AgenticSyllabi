import type { ReactNode } from "react";
import type { CoursePlan } from "@/types/plan";
import { PlanUnitsSidebar } from "./PlanUnitsSidebar";

type PlanCourseShellProps = {
  plan: CoursePlan;
  activeTopicId?: string;
  children: ReactNode;
};

/**
 * Plan dashboard layout: shared collapsible units rail + main column (plan intro or topic).
 */
export function PlanCourseShell({ plan, activeTopicId, children }: PlanCourseShellProps) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col md:flex-row">
      <PlanUnitsSidebar plan={plan} activeTopicId={activeTopicId} />
      <div className="min-h-0 min-w-0 flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
