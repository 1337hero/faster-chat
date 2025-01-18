"use client";

export function Sidebar() {
  return (
    <div className="flex h-full flex-col bg-macchiato-mantle">
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2" aria-label="Sidebar Navigation">
          {/* Sidebar content goes here */}
          <div className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Chat History
          </div>
        </nav>
      </div>
    </div>
  );
}
