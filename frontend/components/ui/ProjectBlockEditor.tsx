'use client';

import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';
import { 
  Plus, 
  X, 
  Trash2, 
  Edit, 
  Eye,
  Link,
  Image,
  Save,
  FileText
} from 'lucide-react';
import { ProjectBlock, ProjectLink } from '../../types/project';

interface ProjectBlockEditorProps {
  blocks: ProjectBlock[];
  onChange: (blocks: ProjectBlock[]) => void;
}

export function ProjectBlockEditor({ blocks, onChange }: ProjectBlockEditorProps) {
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<Partial<ProjectLink>>({
    title: '',
    url: '',
    type: 'other'
  });

  const addBlock = () => {
    const newBlock: ProjectBlock = {
      id: Date.now().toString(),
      title: '',
      content: '',
      links: []
    };
    onChange([...blocks, newBlock]);
    setEditingBlock(newBlock.id);
  };

  const updateBlock = (blockId: string, updates: Partial<ProjectBlock>) => {
    const updatedBlocks = blocks.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    );
    onChange(updatedBlocks);
  };

  const deleteBlock = (blockId: string) => {
    const updatedBlocks = blocks.filter(block => block.id !== blockId);
    onChange(updatedBlocks);
    if (editingBlock === blockId) {
      setEditingBlock(null);
    }
  };

  const addLinkToBlock = (blockId: string) => {
    if (!newLink.title || !newLink.url) return;
    
    const link: ProjectLink = {
      id: Date.now().toString(),
      title: newLink.title,
      url: newLink.url,
      type: newLink.type as any
    };

    updateBlock(blockId, {
      links: [...(blocks.find(b => b.id === blockId)?.links || []), link]
    });

    setNewLink({ title: '', url: '', type: 'other' });
  };

  const removeLinkFromBlock = (blockId: string, linkId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const updatedLinks = block.links?.filter(link => link.id !== linkId) || [];
    updateBlock(blockId, {
      links: updatedLinks
    });
  };

  const linkTypeOptions = [
    { value: 'website', label: 'Веб-сайт' },
    { value: 'github', label: 'GitHub' },
    { value: 'documentation', label: 'Документация' },
    { value: 'demo', label: 'Демо' },
    { value: 'other', label: 'Другое' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Блоки описания
        </h3>
        <Button onClick={addBlock} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить блок
        </Button>
      </div>

      {blocks.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Блоки описания не добавлены
          </p>
          <Button onClick={addBlock}>
            <Plus className="h-4 w-4 mr-2" />
            Создать первый блок
          </Button>
        </Card>
      )}

      {blocks.map((block, index) => {
        if (!block) return null;
        return (
        <Card key={block.id} className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Блок {index + 1}
              </span>
              {block.title && (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  - {block.title}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
              >
                {editingBlock === block.id ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {editingBlock === block.id ? 'Просмотр' : 'Редактировать'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteBlock(block.id)}
                className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {editingBlock === block.id ? (
            <div className="space-y-4">
              <Input
                label="Название блока"
                value={block.title}
                onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                placeholder="Введите название блока"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Содержимое (Markdown)
                </label>
                <Textarea
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="Введите содержимое блока в формате Markdown..."
                  rows={6}
                />
              </div>

              <Input
                label="GIF для блока (URL)"
                value={block.gifUrl || ''}
                onChange={(e) => updateBlock(block.id, { gifUrl: e.target.value })}
                placeholder="https://example.com/demo.gif"
                leftIcon={<Image className="h-4 w-4" />}
              />

              {/* Ссылки блока */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Ссылки блока
                  </h4>
                </div>

                {block.links && block.links.length > 0 && (
                  <div className="space-y-2">
                    {block.links.map((link) => (
                      <div key={link.id} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <Link className="h-4 w-4 text-gray-400" />
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">
                          {link.title}
                        </span>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          {link.url}
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLinkFromBlock(block.id, link.id)}
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Добавление новой ссылки */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Название ссылки"
                      value={newLink.title || ''}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    />
                    <Input
                      placeholder="URL"
                      value={newLink.url || ''}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    />
                    <div className="flex space-x-2">
                      <Select
                        value={newLink.type || 'other'}
                        onChange={(value) => setNewLink({ ...newLink, type: value })}
                        options={linkTypeOptions}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => addLinkToBlock(block.id)}
                        disabled={!newLink.title || !newLink.url}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {block.title && (
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {block.title}
                </h4>
              )}
              {block.content && (
                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {block.content}
                </div>
              )}
              {block.gifUrl && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  GIF: {block.gifUrl}
                </div>
              )}
              {block.links && block.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {block.links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded"
                    >
                      <Link className="h-3 w-3 mr-1" />
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
        );
      })}
    </div>
  );
}
