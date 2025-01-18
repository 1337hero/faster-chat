import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "AI Chat",
  description: "Your AI Chat Assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SidebarLayout sidebar={<Sidebar />} navbar={<Navbar />}>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
