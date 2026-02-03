// Модуль интеграции с Notion — выдача/отзыв доступа
// SCIM API в Notion поддерживает только members, не guests. Добавление как member отключено.
// Гостей нужно приглашать вручную через интерфейс Notion или иной способ.

const NOTION_SCIM_BASE = 'https://api.notion.com/scim/v2';

export interface GrantAccessResult {
  success: boolean;
  error?: string;
}

function getScimToken(): string | null {
  return process.env.NOTION_SCIM_TOKEN?.trim() || null;
}

/**
 * Найти пользователя в workspace по email (SCIM GET Users с filter)
 */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const token = getScimToken();
  if (!token) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const filter = encodeURIComponent(`emails.value eq "${normalizedEmail}"`);
  const url = `${NOTION_SCIM_BASE}/Users?filter=${filter}&count=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/scim+json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const user = data.Resources?.[0];
  if (user?.id) return { id: user.id };
  return null;
}

/**
 * Выдать доступ к Notion по email.
 * Notion SCIM API не поддерживает приглашение гостей (только members).
 * Чтобы не добавлять пользователей как member, автоматическая выдача через SCIM отключена.
 * Гостей приглашайте вручную в Notion или настройте другой способ.
 */
export async function grantAccess(
  email: string,
  _userId: string,
  _subscriptionId: string
): Promise<GrantAccessResult> {
  try {
    if (!email?.trim()) {
      return { success: false, error: 'Email не указан' };
    }
    // Не добавляем через SCIM — иначе пользователь станет member, а не guest.
    // В Notion гостей через SCIM добавить нельзя.
    console.warn('[Notion] Автовыдача доступа отключена: SCIM добавляет только members, не guests. Приглашайте гостей вручную.');
    return { success: false, error: 'Notion: приглашение гостей через API недоступно (SCIM только для members). Пригласите вручную в Notion.' };
  } catch (e) {
    console.error('grantAccess error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * Отозвать доступ из Notion workspace по email (SCIM DELETE User)
 */
export async function revokeAccess(email: string, _subscriptionId?: string): Promise<GrantAccessResult> {
  try {
    const token = getScimToken();
    if (!token) {
      return { success: false, error: 'NOTION_SCIM_TOKEN не задан в .env' };
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: 'Email не указан' };
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      // Пользователя нет в workspace — считаем успехом (доступ уже отозван)
      return { success: true };
    }

    const res = await fetch(`${NOTION_SCIM_BASE}/Users/${user.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok || res.status === 204) {
      return { success: true };
    }

    const text = await res.text();
    let errMsg = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.detail || json.message) errMsg = json.detail || json.message;
    } catch {
      if (text) errMsg = text.slice(0, 200);
    }
    console.error('[Notion SCIM] revokeAccess failed:', res.status, errMsg);
    return { success: false, error: errMsg };
  } catch (e) {
    console.error('revokeAccess error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
