import ChatInterface from "@/components/chat/ChatInterface";

interface Props {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ChatPage({ params }: Props) {
  return (
    <div className="flex-1">
      <ChatInterface chatId={params.id} />
    </div>
  );
}