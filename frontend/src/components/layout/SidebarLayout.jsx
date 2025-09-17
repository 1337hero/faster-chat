/**
 * Layout component with sidebar
 * @param {object} props
 * @param {React.ReactNode} props.sidebar
 * @param {React.ReactNode} props.navbar
 * @param {React.ReactNode} props.children
 */
export function SidebarLayout({ sidebar, navbar, children }) {
  return (
    <div className="relative flex h-[100dvh] bg-latte-base dark:bg-macchiato-base">
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
