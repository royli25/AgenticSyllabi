export interface Reading {
  reading_id: string;
  title: string;
  url: string;
  summary: string;
}

export interface ProjectBrief {
  title: string;
  description: string;
  deliverables: string[];
  estimated_hours: number;
}

export interface TopicContent {
  explainer: string;
  readings: Reading[];
  project: ProjectBrief;
}

export interface Topic {
  topic_id: string;
  title: string;
  original_syllabus_topic: string;
  learning_outcomes: string[];
  interest_angle: string;
  status: "pending" | "complete";
  content?: TopicContent;
}

export interface CoursePlan {
  plan_id: string;
  session_id: string;
  course_id: string;
  course_title: string;
  student_interest: string;
  interest_keywords: string[];
  domain_context: string;
  topics: Topic[];
}

export type PlanStatus =
  | "pending"
  | "researching"
  | "planning"
  | "generating"
  | "complete"
  | "error";
