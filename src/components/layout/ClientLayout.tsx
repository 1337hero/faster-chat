"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useEffect, useState } from "react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div suppressHydrationWarning>
      <SidebarLayout
        sidebar={<div suppressHydrationWarning><Sidebar /></div>}
        navbar={<div suppressHydrationWarning><Navbar /></div>}>
        <div suppressHydrationWarning>
          {mounted ? children : null}
        </div>
      </SidebarLayout>
    </div>
  );
}