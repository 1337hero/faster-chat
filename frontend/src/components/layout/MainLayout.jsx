const MainLayout = ({ sidebar, children }) => {
  return (
    <div className="bg-theme-background flex h-screen w-full">
      {/* Sidebar */}
      {sidebar}

      {/* Main Content */}
      <main className="bg-theme-background relative z-0 flex h-full flex-1 flex-col">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
