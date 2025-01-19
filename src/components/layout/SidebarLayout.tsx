"use client";
//import { useState } from "react";

type SidebarLayoutProps = {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
};

export function SidebarLayout({ sidebar, navbar, children }: SidebarLayoutProps) {
  //const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="relative flex h-[100dvh] bg-macchiato-base max-lg:flex-col">
      {/* Desktop Sidebar */}
      <nav className="flex w-64 max-lg:hidden">{sidebar}</nav>

      {/* Mobile Sidebar - this needs worked out */}

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Mobile Navbar */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 lg:hidden">
          <button
            //onClick={() => setShowMobileSidebar(true)}
            className="rounded-md p-2 hover:bg-gray-100">
            <MenuIcon className="h-6 w-6" />
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
