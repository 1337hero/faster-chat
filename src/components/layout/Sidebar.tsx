"use client";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function Sidebar() {
  const chats = useLiveQuery(() => db.getChats(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (isMobile) setIsSidebarOpen(false);
  };

  const handleLinkClick = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-4 z-40 rounded-md bg-macchiato-surface0 p-2 text-macchiato-text"
          aria-label="Open sidebar">
          <MenuIcon className="h-6 w-6" />
        </button>
      )}
      
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'relative h-full'
        } ${
          isSidebarOpen ? 'w-[90%] md:w-80' : 'md:w-20'
        } flex flex-col bg-macchiato-mantle`}
      >
        <div className="flex items-center justify-between p-4">
          <h1 className={`font-display text-xl font-bold text-macchiato-text ${!isSidebarOpen && 'md:hidden'}`}>
            Faster ⚡️ Chat
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="rounded-md p-1 text-macchiato-text hover:bg-macchiato-surface0"
          >
            {isSidebarOpen ? 
              <ChevronLeftIcon className="h-6 w-6" /> : 
              <ChevronRightIcon className="hidden md:block h-6 w-6" />
            }
          </button>
        </div>

        <div className={`p-4 ${!isSidebarOpen && 'md:hidden'}`}>
          <Button onClick={handleNewChat} className="w-full justify-start gap-2">
            <PlusIcon className="h-5 w-5" />
            New Chat
          </Button>
        </div>

        <div className={`flex-1 overflow-y-auto scrollbar scrollbar-track-transparent scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600 p-2 [&::-webkit-scrollbar]:w-[0.25rem] ${
          !isSidebarOpen && 'md:hidden'
        }`}>
          <nav className="space-y-2" aria-label="Chat History">
            {chats?.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                onClick={handleLinkClick}
                className={`group flex items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-macchiato-surface0 ${
                  pathname === `/chat/${chat.id}` ? "bg-macchiato-surface0" : ""
                }`}
              >
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
        
        <div className={`border-t border-macchiato-surface0 p-4 ${!isSidebarOpen && 'md:hidden'}`}>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-macchiato-text hover:bg-macchiato-surface0"
            onClick={() => {/* TODO: Implement settings */}}
          >
            <SettingsIcon className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
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

function MenuIcon(props: React.ComponentProps<"svg">) {
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
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function ChevronLeftIcon(props: React.ComponentProps<"svg">) {
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
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.ComponentProps<"svg">) {
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
      <path d="M9 18l6-6-6-6" />
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

function SettingsIcon(props: React.ComponentProps<"svg">) {
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
