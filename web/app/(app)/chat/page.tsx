import type { Metadata } from "next";
import { hasGemini } from "@/lib/llm";
import { ChatView } from "./chat-view";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return <ChatView llm={hasGemini()} />;
}
