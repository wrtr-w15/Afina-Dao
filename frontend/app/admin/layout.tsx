'use client';

import React, { useState } from 'react';
import { ToastProvider } from '@/components/admin/ToastContext';
import { ToastContainer, type Toast } from '@/components/admin/Toast';

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastProvider toasts={toasts} setToasts={setToasts}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastProvider>
  );
}
