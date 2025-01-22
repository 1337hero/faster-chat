'use client';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Sidebar() {
  const chats = useLiveQuery(() => db.getChats(), []);
  const pathname = usePathname();
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const handleNewChat = async () => {
    const newChat = await db.createChat();
    router.push(`/chat/${newChat.id}`);
  };

  return (
    <div className="flex h-full w-full flex-col bg-macchiato-mantle">
      <div className="p-4">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2">
          <PlusIcon className="h-5 w-5" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-2" aria-label="Chat History">
          {chats?.map((chat) => (
            <Link 
              key={chat.id} 
              href={`/chat/${chat.id}`}
              className={`flex flex-col rounded-lg px-3 py-2 text-sm transition-colors hover:bg-macchiato-surface0
                ${pathname === `/chat/${chat.id}` ? 'bg-macchiato-surface0' : ''}`}>
              <span className="font-medium text-macchiato-text line-clamp-1">
                {chat.title || 'New Chat'}
              </span>
              <span className="text-xs text-macchiato-subtext0">
                {formatDate(chat.updated_at)}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function PlusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}