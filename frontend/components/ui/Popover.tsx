'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

interface PopoverProps {
  children: React.ReactNode;
  content: React.ReactNode;
  trigger?: 'click' | 'hover';
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
  className?: string;
  popoverClassName?: string;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function Popover({
  children,
  content,
  trigger = 'click',
  placement = 'bottom',
  offset = 8,
  className,
  popoverClassName,
  disabled = false,
  onOpen,
  onClose,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.left - popoverRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }

    // Adjust position if popover goes outside viewport
    if (left < 0) left = 8;
    if (left + popoverRect.width > viewportWidth) left = viewportWidth - popoverRect.width - 8;
    if (top < 0) top = 8;
    if (top + popoverRect.height > viewportHeight) top = viewportHeight - popoverRect.height - 8;

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          triggerRef.current &&
          popoverRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !popoverRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      const handleScroll = () => {
        updatePosition();
      };

      const handleResize = () => {
        updatePosition();
      };

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (disabled) return;
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  const handleTriggerMouseEnter = () => {
    if (disabled) return;
    if (trigger === 'hover') {
      setIsOpen(true);
    }
  };

  const handleTriggerMouseLeave = () => {
    if (disabled) return;
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const popoverContent = isOpen && (
    <div
      ref={popoverRef}
      className={clsx(
        'fixed z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        popoverClassName
      )}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {content}
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={clsx('inline-block', className)}
        onClick={handleTriggerClick}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
      >
        {children}
      </div>
      {typeof window !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  );
}

export default Popover;
