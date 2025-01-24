"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

export function Sidebar() {
  const chats = useLiveQuery(() => db.getChats(), []);
  const pathname = usePathname();
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const handleDeleteChat = useCallback(
    async (e: React.MouseEvent, chatId: string) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        await db.deleteChat(chatId);
        if (pathname === `/chat/${chatId}`) {
          router.push("/");
        }
      } catch (error) {
        console.error("Error deleting chat:", error);
      }
    },
    [pathname, router]
  );

  const handleNewChat = async () => {
    const newChat = await db.createChat();
    router.push(`/chat/${newChat.id}`);
  };

  return (
    <div className="flex h-full w-full flex-col bg-macchiato-mantle">
      <div className="p-4">
        <h1 className="font-display text-xl font-bold text-macchiato-text">Faster ⚡️ Chat</h1>
      </div>
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
              className={`group flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-macchiato-surface0 ${pathname === `/chat/${chat.id}` ? "bg-macchiato-surface0" : ""}`}>
              <div className="flex-1">
                <span className="line-clamp-1 block font-medium text-macchiato-text">
                  {chat.title || "New Chat"}
                </span>
                <span className="block text-xs text-macchiato-subtext0">
                  {formatDate(chat.updated_at)}
                </span>
              </div>
              <button
                onClick={(e) => handleDeleteChat(e, chat.id)}
                className="invisible ml-2 rounded p-1 text-macchiato-subtext0 group-hover:visible hover:bg-macchiato-surface1 hover:text-macchiato-red"
                aria-label="Delete chat">
                <TrashIcon className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function TrashIcon(props: React.ComponentProps<"svg">) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function PlusIcon(props: React.ComponentProps<"svg">) {
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
