import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { isBlocked, notifyAdminBlockedAttempt } from '@/lib/blocklist';

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_ME_URL = 'https://discord.com/api/users/@me';

// GET /api/discord/callback — OAuth callback после авторизации в Discord
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const successUrl = `${baseUrl}/discord/connected`;
  const errorUrl = `${baseUrl}/discord/error`;

  // Пользователь отменил авторизацию в Discord
  if (errorParam) {
    const message = errorDescription ? encodeURIComponent(errorDescription) : 'authorization_denied';
    return NextResponse.redirect(`${errorUrl}?reason=${message}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Отсутствуют code или state')}`);
  }

  let telegramId: number;
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (typeof parsed.telegramId !== 'number') throw new Error('Invalid state');
    telegramId = parsed.telegramId;
  } catch {
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Неверная ссылка. Начните подключение Discord из Telegram бота заново.')}`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `${baseUrl}/api/discord/callback`;

  if (!clientId || !clientSecret) {
    console.error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not set');
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Сервер не настроен для Discord')}`);
  }

  // Обмен code на access_token
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
  } catch (e) {
    console.error('Discord token request failed:', e);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Не удалось связаться с Discord')}`);
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('Discord token error:', tokenRes.status, text);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Ошибка авторизации Discord')}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Ответ Discord без токена')}`);
  }

  // Получить данные пользователя Discord
  let meRes: Response;
  try {
    meRes = await fetch(DISCORD_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (e) {
    console.error('Discord /users/@me failed:', e);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Не удалось получить данные Discord')}`);
  }

  if (!meRes.ok) {
    console.error('Discord /users/@me error:', meRes.status);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Ошибка получения профиля Discord')}`);
  }

  const discordUser = await meRes.json();
  const discordId = String(discordUser.id);
  const discordUsername = discordUser.username
    ? `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`
    : null;

  const discordBlocked = await isBlocked('discord', discordId);
  if (discordBlocked) {
    await notifyAdminBlockedAttempt('discord', discordId, telegramId);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Подключение этого Discord аккаунта запрещено. Обратитесь в поддержку.')}`);
  }

  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE telegram_id = ?',
      [telegramId]
    );
    if ((rows as any[]).length === 0) {
      return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Пользователь не найден. Сначала напишите боту в Telegram.')}`);
    }

    // Проверка: этот Discord уже привязан к другому аккаунту?
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE discord_id = ? AND telegram_id != ?',
      [discordId, telegramId]
    );
    if ((existing as any[]).length > 0) {
      return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Этот Discord уже привязан к другому аккаунту')}`);
    }

    await connection.execute(
      'UPDATE users SET discord_id = ?, discord_username = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_id = ?',
      [discordId, discordUsername || discordId, telegramId]
    );
  } catch (e) {
    console.error('DB error in discord callback:', e);
    return NextResponse.redirect(`${errorUrl}?reason=${encodeURIComponent('Ошибка сохранения. Попробуйте позже.')}`);
  } finally {
    connection.release();
  }

  return NextResponse.redirect(successUrl);
}
