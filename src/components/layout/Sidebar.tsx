"use client";

import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const chats = useLiveQuery(async () => {
    return await db.chats.reverse().toArray();
  });

  const createNewChat = async () => {
    const chat = await db.createChat();
    router.push(`/chat/${chat.id}`);
  };

  return (
    <div className="flex h-full flex-col bg-macchiato-mantle">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={createNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-macchiato-blue p-4 text-sm font-medium text-macchiato-base transition-colors hover:bg-macchiato-blue/90"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="transition-opacity duration-300">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {chats?.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors overflow-hidden ${
                pathname === `/chat/${chat.id}`
                  ? "bg-macchiato-surface0 text-macchiato-text"
                  : "text-macchiato-subtext0 hover:bg-macchiato-surface0 hover:text-macchiato-text"
              }`}
            >
              <ChatIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate transition-opacity duration-300">
                {chat.title || "New Chat"}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Settings Section */}
      <div className="border-t border-macchiato-surface0 p-4">
        <button
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-macchiato-subtext0 hover:bg-macchiato-surface0 hover:text-macchiato-text"
        >
          <SettingsIcon className="h-4 w-4 flex-shrink-0" />
          <span className="transition-opacity duration-300">Settings</span>
        </button>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
