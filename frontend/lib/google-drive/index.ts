// Модуль интеграции с Google Drive API — выдача/отзыв доступа к папке

import { google } from 'googleapis';

export interface GrantAccessResult {
  success: boolean;
  error?: string;
}

/**
 * Получить клиент Google Drive API с авторизацией через Service Account
 */
function getDriveClient() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!folderId || !folderId.trim()) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  if (!serviceAccountJson || !serviceAccountJson.trim()) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
    
    // Проверяем обязательные поля
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Service account JSON is missing required fields (client_email or private_key)');
    }
  } catch (e: any) {
    if (e.message?.includes('missing required fields')) {
      throw e;
    }
    throw new Error(`Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON: ${e.message}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Выдать доступ к Google Drive папке по email пользователя (только просмотр)
 */
export async function grantAccess(
  email: string,
  userId: string,
  subscriptionId: string
): Promise<GrantAccessResult> {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID is not configured');
      return { success: false, error: 'Google Drive integration not configured' };
    }

    if (!email || !email.trim()) {
      return { success: false, error: 'Email is required' };
    }

    const drive = getDriveClient();

    // Выдаем доступ с ролью "reader" (только просмотр)
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'reader', // Только просмотр, без возможности редактирования
        type: 'user',
        emailAddress: email.trim().toLowerCase(),
      },
      sendNotificationEmail: false, // Не отправляем уведомление по email
    });

    console.log(`[Google Drive] Access granted to ${email} for folder ${folderId}`);
    return { success: true };
  } catch (e: any) {
    console.error('[Google Drive] grantAccess error:', e);
    
    // Если доступ уже существует, считаем это успехом
    if (e.code === 409 || e.message?.includes('already exists')) {
      console.log(`[Google Drive] Access already exists for ${email}`);
      return { success: true };
    }

    return {
      success: false,
      error: e.message || 'Failed to grant Google Drive access',
    };
  }
}

/**
 * Отозвать доступ к Google Drive папке по email
 */
export async function revokeAccess(
  email: string,
  subscriptionId?: string
): Promise<GrantAccessResult> {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      console.error('GOOGLE_DRIVE_FOLDER_ID is not configured');
      return { success: false, error: 'Google Drive integration not configured' };
    }

    if (!email || !email.trim()) {
      return { success: false, error: 'Email is required' };
    }

    const drive = getDriveClient();

    // Получаем список разрешений для папки
    const permissionsResponse = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(id,emailAddress,role)',
    });

    const permissions = permissionsResponse.data.permissions || [];
    
    // Находим разрешение для данного email
    const permission = permissions.find(
      (p) => p.emailAddress?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!permission || !permission.id) {
      console.log(`[Google Drive] No permission found for ${email}`);
      return { success: true }; // Уже нет доступа, считаем успехом
    }

    // Удаляем разрешение
    await drive.permissions.delete({
      fileId: folderId,
      permissionId: permission.id,
    });

    console.log(`[Google Drive] Access revoked for ${email} from folder ${folderId}`);
    return { success: true };
  } catch (e: any) {
    console.error('[Google Drive] revokeAccess error:', e);
    return {
      success: false,
      error: e.message || 'Failed to revoke Google Drive access',
    };
  }
}
