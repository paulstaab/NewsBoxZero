'use client';

import { SidebarProvider } from '@/components/Sidebar/SidebarContext';

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
