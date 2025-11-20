const MainLayout = ({ sidebar, children }) => {
  return (
    <div className="bg-latte-base dark:bg-macchiato-base flex h-screen w-full">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content */}
      <main className="bg-latte-base dark:bg-macchiato-base relative z-0 flex h-full flex-1 flex-col">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
