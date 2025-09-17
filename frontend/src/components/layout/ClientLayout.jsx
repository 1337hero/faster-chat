import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarLayout } from '@/components/layout/SidebarLayout';

export default function ClientLayout({ children }) {
  return (
    <SidebarLayout
      sidebar={<Sidebar />}
      navbar={<Navbar />}>
      {children}
    </SidebarLayout>
  );
}
