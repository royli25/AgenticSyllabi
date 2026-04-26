export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  interest_confirmed: boolean;
  interest_domain?: string;
  interest_keywords?: string[];
}

export interface UploadResponse {
  course_id: string;
  session_id: string;
  course_title: string;
  required_topics: string[];
}
