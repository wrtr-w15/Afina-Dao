'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
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
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);

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
        setRequestId(data.requestId);
        setIsWaitingForConfirmation(true);
        setMessage({ 
          type: 'info', 
          text: 'Please check your Telegram for confirmation. Waiting for approval...' 
        });
        
        // Начинаем проверку статуса
        checkConfirmationStatus(data.requestId);
      } else {
        setMessage({ type: 'error', text: data.error || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConfirmationStatus = async (requestId: string) => {
    const maxAttempts = 30; // 5 минут с интервалом 10 секунд
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/auth?requestId=${requestId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success === true) {
          setMessage({ type: 'success', text: 'Access approved! Redirecting...' });
          setTimeout(() => {
            router.push('/admin');
          }, 1000);
          return;
        } else if (data.success === false) {
          setMessage({ type: 'error', text: 'Access denied by administrator.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
          return;
        } else if (data.status === 'expired') {
          setMessage({ type: 'error', text: 'Request expired. Please try again.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
          return;
        }

        // Если статус все еще pending, продолжаем проверку
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // Проверяем каждые 10 секунд
        } else {
          setMessage({ type: 'error', text: 'Request expired. Please try again.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
        }
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setMessage({ type: 'error', text: 'Connection error. Please try again.' });
          setIsWaitingForConfirmation(false);
          setRequestId(null);
        }
      }
    };

    checkStatus();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Two-factor authentication required
          </p>
        </div>

        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <div className="p-6 pb-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              Secure Access
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Admin Password
                </Label>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter admin password"
                    disabled={isLoading || isWaitingForConfirmation}
                  />
                </div>
              </div>

              {message && (
                <Badge 
                  variant={message.type === 'success' ? 'success' : message.type === 'error' ? 'danger' : 'default'}
                  className="w-full p-3 text-center flex items-center justify-center gap-2"
                >
                  {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
                  {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                  {message.type === 'info' && <Smartphone className="h-4 w-4" />}
                  {message.text}
                </Badge>
              )}

              <Button
                type="submit"
                disabled={isLoading || isWaitingForConfirmation}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : isWaitingForConfirmation ? (
                  <>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Waiting for Telegram confirmation...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Login
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>🔐 Two-factor authentication</p>
                <p>📱 Telegram confirmation required</p>
                <p>🌍 IP and location tracking</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}