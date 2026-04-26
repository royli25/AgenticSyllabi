import client from "./client";
import type { UploadResponse } from "@/types/chat";

export async function uploadSyllabus(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post<UploadResponse>("/courses/upload-syllabus", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
