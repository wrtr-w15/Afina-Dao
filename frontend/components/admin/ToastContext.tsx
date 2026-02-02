'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { Toast, ToastType } from './Toast';

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, toasts, setToasts }) => {
  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);
  }, [setToasts]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration || 7000); // Ошибки показываются дольше
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
    </ToastContext.Provider>
  );
};
