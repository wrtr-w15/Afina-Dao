'use client';

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function AdminLayout({ 
  children, 
  title = "Admin - Afina DAO Wiki",
  description = "Панель администратора"
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Admin Sidebar */}
        <AdminSidebar 
          isCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        {/* Main Content */}
        <div className="flex-1 bg-white dark:bg-gray-900">
          <div className="min-h-screen">
            {/* Page Content */}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
