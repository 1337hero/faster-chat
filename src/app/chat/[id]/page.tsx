import ChatInterface from "@/components/chat/ChatInterface";
import type { Metadata } from "next";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Chat",
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  return (
    <div className="flex-1">
      <ChatInterface chatId={id} />
    </div>
  );
}
