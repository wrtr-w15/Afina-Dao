'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Smartphone
} from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/admin';
  
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);
  
  // Проверяем, авторизован ли пользователь уже
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          router.push(redirectTo);
        }
      } catch (error) {
        // Не авторизован
      }
    };
    checkAuth();
  }, [router, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // DEV MODE: Direct login without Telegram
        if (data.devMode) {
          setMessage({ 
            type: 'success', 
            text: 'Вход выполнен успешно!' 
          });
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
          return;
        }
        
        setRequestId(data.requestId);
        setIsWaitingForConfirmation(true);
        setMessage({ 
          type: 'info', 
          text: 'Подтвердите вход в Telegram' 
        });
        
        checkConfirmationStatus(data.requestId);
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка входа' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: 'error', text: 'Ошибка сети. Попробуйте снова.' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConfirmationStatus = async (requestId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/auth?requestId=${requestId}`);
        
        if (response.status === 410) {
          const data = await response.json();
          setMessage({ type: 'error', text: data.error || 'Запрос истек' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success === true) {
          setMessage({ type: 'success', text: 'Доступ подтвержден!' });
          setTimeout(() => {
            router.push(redirectTo);
          }, 1000);
          return;
        } else if (data.success === false) {
          setMessage({ type: 'error', text: 'Доступ отклонен.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
          return;
        } else if (data.status === 'expired') {
          setMessage({ type: 'error', text: 'Запрос истек' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setMessage({ type: 'error', text: 'Время ожидания истекло.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
        }
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setMessage({ type: 'error', text: 'Ошибка соединения.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
        }
      }
    };

    checkStatus();
  };

  return (
    <div className="min-h-screen bg-[#0f0f17] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f17] via-[#151521] to-[#0f0f17]" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Админ-панель
          </h1>
          <p className="text-gray-400">
            Afina DAO
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                  placeholder="Введите пароль"
                  disabled={isLoading || isWaitingForConfirmation}
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : message.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              }`}>
                {message.type === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                {message.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                {message.type === 'info' && <Smartphone className="h-5 w-5 flex-shrink-0" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isWaitingForConfirmation}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Проверка...
                </>
              ) : isWaitingForConfirmation ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Ожидание подтверждения...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Войти
                </>
              )}
            </button>
          </form>

          {/* Footer info */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Защищенный вход
              </span>
              <span className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                2FA через Telegram
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
