'use client';

import { ReactNode, memo } from 'react';
import { Fingerprint, Activity, Lock } from 'lucide-react';

interface ReflectiveCardProps {
  children?: ReactNode;
  blurStrength?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
  overlayColor?: string;
  displacementStrength?: number;
  noiseScale?: number;
  specularConstant?: number;
  grayscale?: number;
  glassDistortion?: number;
  className?: string;
  style?: React.CSSProperties;
}

const ReflectiveCard = memo(({
  children,
  blurStrength = 12,
  color = 'white',
  metalness = 1,
  roughness = 0.4,
  overlayColor = 'rgba(255, 255, 255, 0.1)',
  displacementStrength = 20,
  noiseScale = 1,
  specularConstant = 1.2,
  grayscale = 1,
  glassDistortion = 0,
  className = '',
  style = {}
}: ReflectiveCardProps) => {
  // Removed webcam access - using static gradient background instead

  const baseFrequency = 0.03 / Math.max(0.1, noiseScale);
  const saturation = 1 - Math.max(0, Math.min(1, grayscale));

  const cssVariables = {
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--overlay-color': overlayColor,
    '--text-color': color,
    '--saturation': saturation
  } as React.CSSProperties;

  const defaultStyle = { width: '320px', height: '500px' };
  const finalStyle = { ...defaultStyle, ...style, ...cssVariables };

  return (
    <div
      className={`relative rounded-[20px] overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 border border-blue-200/50 dark:border-blue-800/30 shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] isolate font-sans ${className}`}
      style={finalStyle}
    >
      <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
        <defs>
          <filter id="metallic-displacement" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency={baseFrequency} numOctaves={2} result="noise" />
            <feColorMatrix in="noise" type="luminanceToAlpha" result="noiseAlpha" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementStrength}
              xChannelSelector="R"
              yChannelSelector="G"
              result="rippled"
            />
            <feSpecularLighting
              in="noiseAlpha"
              surfaceScale={displacementStrength}
              specularConstant={specularConstant}
              specularExponent="20"
              lightingColor="#ffffff"
              result="light"
            >
              <fePointLight x="0" y="0" z="300" />
            </feSpecularLighting>
            <feComposite in="light" in2="rippled" operator="in" result="light-effect" />
            <feBlend in="light-effect" in2="rippled" mode="screen" result="metallic-result" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="solidAlpha"
            />
            <feMorphology in="solidAlpha" operator="erode" radius="45" result="erodedAlpha" />
            <feGaussianBlur in="erodedAlpha" stdDeviation="10" result="blurredMap" />
            <feComponentTransfer in="blurredMap" result="glassMap">
              <feFuncA type="linear" slope="0.5" intercept="0" />
            </feComponentTransfer>
            <feDisplacementMap
              in="metallic-result"
              in2="glassMap"
              scale={glassDistortion}
              xChannelSelector="A"
              yChannelSelector="A"
              result="final"
            />
          </filter>
        </defs>
      </svg>

      {/* Static gradient background instead of webcam video */}
      <div 
        className="absolute top-0 left-0 w-full h-full z-0 opacity-30 dark:opacity-20 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 50%, rgba(99, 102, 241, 0.3) 100%)',
          filter: `blur(var(--blur-strength, 12px))`,
          willChange: 'opacity',
          transform: 'translateZ(0)' // GPU acceleration
        }}
      />

      <div className="absolute inset-0 z-10 opacity-20 dark:opacity-[var(--roughness,0.4)] pointer-events-none bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%20200%20200%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cfilter%20id%3D%27noiseFilter%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.8%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%23noiseFilter)%27%2F%3E%3C%2Fsvg%3E')] mix-blend-overlay" />

      <div className="absolute inset-0 z-20 bg-[linear-gradient(135deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0.2)_40%,rgba(255,255,255,0)_50%,rgba(255,255,255,0.2)_60%,rgba(255,255,255,0.4)_100%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.1)_40%,rgba(255,255,255,0)_50%,rgba(255,255,255,0.1)_60%,rgba(255,255,255,0.3)_100%)] pointer-events-none mix-blend-overlay opacity-[calc(var(--metalness,1)*1.2)] dark:opacity-[var(--metalness,1)]" />

      <div className="absolute inset-0 rounded-[20px] p-[1px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.6)_100%)] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] z-20 pointer-events-none" />

      {children ? (
        <div className="relative z-10 h-full">
          {children}
        </div>
      ) : (
        <div className="relative z-10 h-full flex flex-col justify-between p-8 text-[var(--text-color,white)] bg-[var(--overlay-color,rgba(255,255,255,0.05))]">
          <div className="flex justify-between items-center border-b border-white/20 pb-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] px-2 py-1 bg-white/10 rounded border border-white/20">
              <Lock size={14} className="opacity-80" />
              <span>SECURE ACCESS</span>
            </div>
            <Activity className="opacity-80" size={20} />
          </div>

          <div className="flex-1 flex flex-col justify-end items-center text-center gap-6 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-[0.05em] m-0 mb-2 drop-shadow-md">ALEXANDER DOE</h2>
              <p className="text-xs tracking-[0.2em] opacity-70 m-0 uppercase">SENIOR DEVELOPER</p>
            </div>
          </div>

          <div className="flex justify-between items-end border-t border-white/20 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] tracking-[0.1em] opacity-60">ID NUMBER</span>
              <span className="font-mono text-sm tracking-[0.05em]">8901-2345-6789</span>
            </div>
            <div className="opacity-40">
              <Fingerprint size={32} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ReflectiveCard.displayName = 'ReflectiveCard';

export default ReflectiveCard;

