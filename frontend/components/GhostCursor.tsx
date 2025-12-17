'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface GhostCursorProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  size?: number;
}

export default function GhostCursor({ 
  children, 
  className = '',
  intensity = 0.5,
  size = 20
}: GhostCursorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !ghostRef.current) return;

    const container = containerRef.current;
    const ghost = ghostRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!container || !ghost) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate position relative to container center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const offsetX = (x - centerX) * intensity;
      const offsetY = (y - centerY) * intensity;

      ghost.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
      if (ghost) {
        ghost.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      if (ghost) {
        ghost.style.opacity = '0';
        ghost.style.transform = 'translate(0, 0)';
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
    >
      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Ghost cursor effect */}
      <div
        ref={ghostRef}
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          opacity: 0,
          filter: 'blur(20px)',
        }}
      >
        <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-blue-500 dark:text-blue-400 opacity-60">
          {typeof children === 'string' ? children : 'Open Now'}
        </div>
      </div>
    </div>
  );
}

