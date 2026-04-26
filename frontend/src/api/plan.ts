import client from "./client";
import type { CoursePlan, PlanStatus } from "@/types/plan";

export async function generatePlan(sessionId: string, courseId: string) {
  const { data } = await client.post(`/plan/${sessionId}/generate`, { course_id: courseId });
  return data;
}

export async function getPlanStatus(sessionId: string): Promise<{ status: PlanStatus }> {
  const { data } = await client.get(`/plan/${sessionId}/status`);
  return data;
}

export async function getPlan(sessionId: string): Promise<CoursePlan> {
  const { data } = await client.get<CoursePlan>(`/plan/${sessionId}`);
  return data;
}
