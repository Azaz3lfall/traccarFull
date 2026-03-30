import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook para tornar elementos arrastáveis
 * @param {boolean} enabled - Se o drag está habilitado
 * @returns {Object} - Objeto com handlers e estilos
 */
export const useDraggable = (enabled = true) => {
  const [position, setPosition] = useState(null); // null = centralizado, {x, y} = posição absoluta
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (!enabled) return;
    
    // Só permite arrastar pelo título/header
    const isHeader = e.target.closest('[data-drag-handle]') !== null;
    if (!isHeader) return;

    e.preventDefault();
    setIsDragging(true);
    
    const rect = elementRef.current?.getBoundingClientRect();
    if (rect) {
      // Se ainda não foi arrastado, inicializar posição
      if (position === null) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const initialX = centerX - rect.width / 2;
        const initialY = centerY - rect.height / 2;
        setPosition({ x: initialX, y: initialY });
        dragStartPos.current = {
          x: e.clientX - initialX,
          y: e.clientY - initialY,
        };
      } else {
        dragStartPos.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    }
  }, [enabled, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !enabled) return;

    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    // Limitar movimento dentro da viewport
    const maxX = window.innerWidth - (elementRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (elementRef.current?.offsetHeight || 0);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, enabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Adicionar listeners globais quando está arrastando
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const dragHandleProps = {
    onMouseDown: handleMouseDown,
    style: {
      cursor: enabled ? 'grab' : 'default',
    },
    'data-drag-handle': true,
  };

  const draggableStyle = position === null ? {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    margin: 0,
  } : {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'none',
    margin: 0,
  };

  const resetPosition = useCallback(() => {
    setPosition(null);
  }, []);

  return {
    elementRef,
    dragHandleProps,
    draggableStyle,
    isDragging,
    resetPosition,
  };
};

