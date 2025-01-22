import ChatInterface from "@/components/chat/ChatInterface";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function ChatPage({ params }: Props) {
  const resolvedParams = await params;
  
  return (
    <div className="flex-1">
      <ChatInterface chatId={resolvedParams.id} />
    </div>
  );
}