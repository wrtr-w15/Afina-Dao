/**
 * Тест API промокодов (POST /api/promocodes/check).
 * Запуск: npx tsx scripts/test-promocodes.ts
 * Требуется запущенный dev-сервер (npm run dev) и доступная БД.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function check(body: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE}/api/promocodes/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  let passed = 0;
  let failed = 0;

  const ok = (name: string, cond: boolean) => {
    if (cond) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  };

  console.log('--- Проверка валидации (code, amount) ---');

  const r1 = await check({});
  ok('Нет code и amount → 400', r1.status === 400);

  const r2 = await check({ code: '  ' });
  ok('Пустой code (пробелы) → 400', r2.status === 400);

  const r3 = await check({ code: 'TEST', amount: -10 });
  ok('Отрицательный amount → 400', r3.status === 400);

  const r4 = await check({ code: 'TEST', amount: 'not a number' });
  ok('amount не число → 400', r4.status === 400);

  const r5 = await check({ code: 'TEST', amount: 100 });
  ok('Несуществующий код → 200 и valid: false', r5.status === 200 && r5.data.valid === false);

  const r6 = await check({ code: 123, amount: 50 });
  ok('code не строка → 400', r6.status === 400);

  const r7 = await check({ code: 'TEST', amount: 0 });
  ok('amount = 0 допустим (400 или valid: false)', r7.status === 400 || (r7.status === 200 && !r7.data.valid));

  console.log('\n--- Итог ---');
  console.log(`Пройдено: ${passed}, провалено: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
