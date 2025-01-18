"use client";

import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";

type SidebarLayoutProps = {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
};

export function SidebarLayout({ sidebar, navbar, children }: SidebarLayoutProps) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="relative flex min-h-screen w-full bg-macchiato-base max-lg:flex-col">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">{sidebar}</div>

      {/* Mobile Sidebar */}
      <Dialog open={showMobileSidebar} onClose={() => setShowMobileSidebar(false)}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-y-0 left-0 w-full max-w-xs p-4">
          <div className="flex h-full flex-col rounded-lg bg-white shadow-xl">{sidebar}</div>
        </div>
      </Dialog>

      {/* Main Content */}
      <main className="flex flex-1 flex-col lg:pl-64">
        {/* Mobile Navbar */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 lg:hidden">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="rounded-md p-2 hover:bg-gray-100">
            <MenuIcon className="h-6 w-6" />
          </button>
          {navbar}
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  );
}
