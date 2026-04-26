import client from "./client";
import type { ChatResponse } from "@/types/chat";

export async function sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const { data } = await client.post<ChatResponse>(`/chat/${sessionId}/message`, { message });
  return data;
}
