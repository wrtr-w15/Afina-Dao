'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Trash2, Globe, Link as LinkIcon, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/config/languages';

export interface BlockTranslation {
  locale: string;
  title: string;
  content: string;
  gifCaption: string;
}

export interface BlockLink {
  id?: string;
  title: string;
  url: string;
  type: 'website' | 'telegram' | 'documentation' | 'demo' | 'other';
}

export interface TranslatableBlock {
  id?: string;
  gifUrl: string;
  links: BlockLink[];
  translations: Record<LanguageCode, BlockTranslation>;
}

interface TranslatableBlockEditorProps {
  blocks: TranslatableBlock[];
  currentLang: LanguageCode;
  onChange: (blocks: TranslatableBlock[]) => void;
}

export default function TranslatableBlockEditor({ blocks, currentLang, onChange }: TranslatableBlockEditorProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set([0]));

  const addBlock = () => {
    const newBlock: TranslatableBlock = {
      gifUrl: '',
      links: [],
      translations: {} as Record<LanguageCode, BlockTranslation>
    };

    // Инициализируем переводы для всех языков
    SUPPORTED_LANGUAGES.forEach(lang => {
      newBlock.translations[lang.code] = {
        locale: lang.code,
        title: '',
        content: '',
        gifCaption: ''
      };
    });

    const newBlocks = [...blocks, newBlock];
    onChange(newBlocks);
    setExpandedBlocks(new Set(Array.from(expandedBlocks).concat([blocks.length])));
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    const newExpanded = new Set(expandedBlocks);
    newExpanded.delete(index);
    setExpandedBlocks(newExpanded);
  };

  const updateBlock = (index: number, field: keyof TranslatableBlock, value: any) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    onChange(newBlocks);
  };

  const updateBlockTranslation = (blockIndex: number, field: 'title' | 'content' | 'gifCaption', value: string) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = {
      ...newBlocks[blockIndex],
      translations: {
        ...newBlocks[blockIndex].translations,
        [currentLang]: {
          ...newBlocks[blockIndex].translations[currentLang],
          [field]: value
        }
      }
    };
    onChange(newBlocks);
  };

  const addLink = (blockIndex: number) => {
    const newBlocks = [...blocks];
    const newLink: BlockLink = {
      title: '',
      url: '',
      type: 'website'
    };
    newBlocks[blockIndex].links = [...newBlocks[blockIndex].links, newLink];
    onChange(newBlocks);
  };

  const removeLink = (blockIndex: number, linkIndex: number) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].links = newBlocks[blockIndex].links.filter((_, i) => i !== linkIndex);
    onChange(newBlocks);
  };

  const updateLink = (blockIndex: number, linkIndex: number, field: keyof BlockLink, value: string) => {
    const newBlocks = [...blocks];
    newBlocks[blockIndex].links[linkIndex] = {
      ...newBlocks[blockIndex].links[linkIndex],
      [field]: value
    };
    onChange(newBlocks);
  };

  const toggleBlock = (index: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBlocks(newExpanded);
  };

  const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name || currentLang;

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => {
        const isExpanded = expandedBlocks.has(blockIndex);
        const translation = block.translations[currentLang];

        return (
          <Card key={blockIndex} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => toggleBlock(blockIndex)}
                className="flex-1 text-left font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Блок {blockIndex + 1}
                {translation?.title && ` - ${translation.title}`}
              </button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeBlock(blockIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                {/* Translated fields */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Переводимые поля ({currentLangName})
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Заголовок блока *
                      </label>
                      <Input
                        value={translation?.title || ''}
                        onChange={(e) => updateBlockTranslation(blockIndex, 'title', e.target.value)}
                        placeholder="Заголовок блока"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Контент (Markdown) *
                      </label>
                      <Textarea
                        value={translation?.content || ''}
                        onChange={(e) => updateBlockTranslation(blockIndex, 'content', e.target.value)}
                        placeholder="Контент блока (поддержка Markdown)"
                        rows={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Подпись под GIF
                      </label>
                      <Input
                        value={translation?.gifCaption || ''}
                        onChange={(e) => updateBlockTranslation(blockIndex, 'gifCaption', e.target.value)}
                        placeholder="Описание изображения"
                      />
                    </div>
                  </div>
                </div>

                {/* Non-translated fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GIF/Изображение URL
                  </label>
                  <Input
                    value={block.gifUrl}
                    onChange={(e) => updateBlock(blockIndex, 'gifUrl', e.target.value)}
                    placeholder="https://example.com/image.gif"
                  />
                </div>

                {/* Links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ссылки (без перевода)
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addLink(blockIndex)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Добавить ссылку
                    </Button>
                  </div>

                  {block.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-2 mb-2">
                      <Input
                        value={link.title}
                        onChange={(e) => updateLink(blockIndex, linkIndex, 'title', e.target.value)}
                        placeholder="Название ссылки"
                        className="flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(blockIndex, linkIndex, 'url', e.target.value)}
                        placeholder="URL"
                        className="flex-1"
                      />
                      <select
                        value={link.type}
                        onChange={(e) => updateLink(blockIndex, linkIndex, 'type', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="website">Website</option>
                        <option value="telegram">Telegram</option>
                        <option value="documentation">Документация</option>
                        <option value="demo">Demo</option>
                        <option value="other">Другое</option>
                      </select>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeLink(blockIndex, linkIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        onClick={addBlock}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Добавить блок контента
      </Button>
    </div>
  );
}

