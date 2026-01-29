'use client';

import React from 'react';

type DarkVeilProps = {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
  className?: string;
};

/**
 * Упрощённая версия DarkVeil:
 * - сохраняет тот же API (пропсы), чтобы можно было заменить на оригинальный WebGL‑вариант;
 * - даёт тёмный анимированный фон, не ломая сборку;
 * - всегда под основным контентом (z-0), поэтому проекты и текст видны.
 */
export default function DarkVeil({
  hueShift = -50,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 0.2,
  scanlineFrequency = 23,
  warpAmount = 0,
  resolutionScale = 1,
  className = '',
}: DarkVeilProps) {
  // Пока что пропсы не участвуют в расчёте, но оставлены для совместимости
  void hueShift;
  void noiseIntensity;
  void scanlineIntensity;
  void speed;
  void scanlineFrequency;
  void warpAmount;
  void resolutionScale;

  return (
    <div className={`pointer-events-none absolute inset-0 z-0 ${className}`}>
      {/* Глубокий тёмный градиент */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black opacity-90" />

      {/* Лёгкие «шумы» / волны с плавным движением */}
      <div className="absolute inset-[-15%] bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.22),transparent_60%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.98),transparent_55%)] mix-blend-soft-light animate-dark-veil-noise" />
    </div>
  );
}

