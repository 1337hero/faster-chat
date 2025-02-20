"use client";

import { useState } from "react";

type SidebarLayoutProps = {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
};

export default function SidebarLayout({ sidebar, navbar, children }: SidebarLayoutProps) {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative flex h-[100dvh] bg-macchiato-base max-lg:flex-col">
      {/* Desktop Sidebar */}
      <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-[320px]'} max-lg:hidden`}>
        <nav className="h-full">{sidebar}</nav>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-4 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-macchiato-surface0 text-macchiato-text shadow-lg"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <nav className="fixed inset-y-0 left-0 w-[90%] z-50 lg:hidden">
            {sidebar}
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Mobile Navbar */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-macchiato-base px-4 py-2 lg:hidden">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="rounded-md p-2 hover:bg-macchiato-surface0">
            <MenuIcon className="h-6 w-6 text-macchiato-text" />
          </button>
          {navbar}
        </div>

        {/* Content */}
        <div className="relative flex h-[100dvh] flex-col">{children}</div>
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

function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
