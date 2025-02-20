"use client";

type SidebarLayoutProps = {
  sidebar: React.ReactNode;
  navbar: React.ReactNode;
  children: React.ReactNode;
};

export function SidebarLayout({ sidebar, navbar, children }: SidebarLayoutProps) {
  return (
    <div className="relative flex h-[100dvh] bg-macchiato-base">
      {/* Sidebar - handles its own responsive behavior */}
      {sidebar}

      {/* Main Content */}
      <main className="flex flex-1 flex-col md:ml-20">
        {/* Content */}
        <div className="relative flex flex-1 flex-col overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
