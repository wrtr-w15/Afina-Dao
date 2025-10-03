// API для работы с переводами блоков

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export interface BlockTranslationData {
  locale: string;
  title: string;
  content: string;
  gifCaption?: string;
}

export interface BlockWithTranslations {
  id: string;
  gifUrl?: string;
  translations: BlockTranslationData[];
  links?: Array<{
    id?: string;
    title: string;
    url: string;
    type: string;
  }>;
}

// Сохранить переводы блоков
export async function saveBlockTranslations(
  projectId: string, 
  blocks: BlockWithTranslations[]
): Promise<boolean> {
  try {
    console.log('Saving block translations:', {
      projectId,
      blocksCount: blocks.length,
      blocks: blocks.map(b => ({
        id: b.id,
        translationsCount: b.translations?.length || 0,
        translations: b.translations
      }))
    });

    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/blocks/translations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      throw new Error(error.error || 'Failed to save block translations');
    }

    const result = await response.json();
    console.log('Block translations saved successfully:', result);
    return true;
  } catch (error) {
    console.error('Error saving block translations:', error);
    throw error;
  }
}

// Получить переводы блоков
export async function getBlockTranslations(projectId: string): Promise<BlockWithTranslations[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/blocks/translations`);

    if (!response.ok) {
      throw new Error('Failed to fetch block translations');
    }

    const data = await response.json();
    return data.blocks || [];
  } catch (error) {
    console.error('Error fetching block translations:', error);
    return [];
  }
}

