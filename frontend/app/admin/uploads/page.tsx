'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { normalizeErrorMessage } from '@/lib/error-utils';
import {
  Image,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Copy,
  Pencil,
  X,
} from 'lucide-react';

interface UploadItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  url: string;
}

export default function AdminUploadsPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/uploads', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setUploads(data.uploads || []);
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Не удалось загрузить список' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setMessage({ type: 'success', text: `Загружено: ${data.filename}` });
      loadUploads();
      e.target.value = '';
    } catch (err) {
      setMessage({ type: 'error', text: normalizeErrorMessage(err) || 'Ошибка загрузки' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот файл?')) return;
    try {
      const res = await fetch(`/api/admin/uploads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Ошибка удаления');
      setMessage({ type: 'success', text: 'Файл удалён' });
      loadUploads();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Ошибка удаления' });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setMessage({ type: 'success', text: 'Ссылка скопирована' });
    setTimeout(() => setMessage(null), 2000);
  };

  const startEdit = (item: UploadItem) => {
    setEditingId(item.id);
    setEditFilename(item.filename);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/admin/uploads/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: editFilename }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      setMessage({ type: 'success', text: 'Имя файла обновлено' });
      setEditingId(null);
      loadUploads();
    } catch (err) {
      setMessage({ type: 'error', text: normalizeErrorMessage(err) || 'Ошибка сохранения' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFilename('');
  };

  const startReplace = (id: string) => {
    setReplacingId(id);
    replaceInputRef.current?.click();
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = replacingId;
    setReplacingId(null);
    e.target.value = '';
    if (!file || !id) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/uploads/${id}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка замены');
      setMessage({ type: 'success', text: 'Файл заменён' });
      loadUploads();
    } catch (err) {
      setMessage({ type: 'error', text: normalizeErrorMessage(err) || 'Ошибка замены' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <AdminLayout title="Медиа" description="Загрузка изображений и получение ссылок">
      <div className="max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center">
            <Image className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Медиа</h1>
            <p className="text-gray-400 text-sm">Загружайте изображения и используйте ссылки в контенте</p>
          </div>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-6 ${
              message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Загрузка */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleReplace}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/30 hover:text-white transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Загрузка...' : 'Загрузить изображение'}
          </button>
          <p className="text-xs text-gray-500 mt-2">JPEG, PNG, GIF, WebP, SVG. Макс. 10 МБ.</p>
        </div>

        {/* Список */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Пока нет загруженных файлов</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition-colors"
              >
                <div className="aspect-video bg-black/30 flex items-center justify-center p-2">
                  <img
                    src={`${item.url}?t=${item.updatedAt || item.createdAt}`}
                    alt={item.filename}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {!/^image\//.test(item.mimeType) && (
                    <div className="text-gray-500 text-sm">Превью недоступно</div>
                  )}
                </div>
                <div className="p-4">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={editFilename}
                        onChange={(e) => setEditFilename(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-sm outline-none focus:border-fuchsia-500/50"
                        placeholder="Имя файла"
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        title="Сохранить"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                        title="Отмена"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-white truncate mb-1" title={item.filename}>
                      {item.filename}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-3">{formatSize(item.size)}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(item.url)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white text-xs"
                      title="Копировать ссылку"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Ссылка
                    </button>
                    {editingId !== item.id && (
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white text-xs"
                        title="Переименовать"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Имя
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startReplace(item.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/15 hover:text-white text-xs"
                      title="Заменить файл"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Заменить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                      title="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
