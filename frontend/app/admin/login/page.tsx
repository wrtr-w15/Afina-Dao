'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { Alert } from '../../../components/ui/Alert';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { ADMIN_CREDENTIALS, setAdminTokenInCookies } from '../../../lib/auth';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Проверка логина/пароля
    if (formData.username === ADMIN_CREDENTIALS.username && formData.password === ADMIN_CREDENTIALS.password) {
      // Сохраняем токен в localStorage
      localStorage.setItem('admin_token', 'admin_authenticated');
      localStorage.setItem('admin_user', formData.username);
      
      // Устанавливаем токен в cookies для middleware
      setAdminTokenInCookies('admin_authenticated');
      
      // Перенаправляем на админку
      router.push('/admin');
    } else {
      setError('Неверный логин или пароль');
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Вход в админку
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Afina DAO Wiki Admin Panel
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div>
              <Input
                label="Логин"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Введите логин"
                leftIcon={<User className="h-4 w-4" />}
                required
              />
            </div>

            <div>
              <Input
                label="Пароль"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Введите пароль"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Тестовые данные: admin / admin123
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
