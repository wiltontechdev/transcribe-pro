// FirstTimeTooltip - Mini guide tooltip shown only on first use (responsive)
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { hasSeenTooltip, markTooltipSeen } from '../../hooks/useFirstTimeTooltip';

interface FirstTimeTooltipProps {
  id: string;
  guideText: string;
  children: React.ReactNode;
  disabled?: boolean;
  isLightMode?: boolean;
}

export const FirstTimeTooltip: React.FC<FirstTimeTooltipProps> = ({
  id,
  guideText,
  children,
  disabled,
  isLightMode = false,
}) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const shouldShow = !disabled && !hasSeenTooltip(id);

  const [placeAbove, setPlaceAbove] = useState(true);

  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height ?? 50;
    const padding = 8;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceAbove >= tooltipHeight + padding || spaceBelow < spaceAbove;
    setPlaceAbove(above);
    setPos({
      left: rect.left + rect.width / 2,
      top: above ? rect.top - padding : rect.bottom + padding,
    });
  };

  const handleShow = () => {
    if (!shouldShow) return;
    setShow(true);
    requestAnimationFrame(updatePosition);
  };

  const handleHide = () => {
    if (show && shouldShow) {
      markTooltipSeen(id);
    }
    setShow(false);
  };

  useEffect(() => {
    if (show) {
      updatePosition();
      const t = setTimeout(() => {
        markTooltipSeen(id);
        setShow(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [show, id]);

  useEffect(() => {
    if (show) {
      const onScroll = () => updatePosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      };
    }
  }, [show]);

  const tooltipEl = show && (
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        transform: placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        marginTop: placeAbove ? -4 : 4,
        maxWidth: 'min(260px, calc(100vw - 24px))',
        padding: '8px 12px',
        fontSize: '12px',
        lineHeight: 1.4,
        color: isLightMode ? '#1a1a1a' : '#fff',
        background: isLightMode ? 'rgba(255,255,255,0.98)' : 'rgba(30,30,30,0.98)',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
        zIndex: 999999,
        pointerEvents: 'none',
        whiteSpace: 'normal',
        textAlign: 'center',
      }}
    >
      {guideText}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      onTouchStart={() => {
        if (shouldShow) {
          handleShow();
          setTimeout(handleHide, 3500);
        }
      }}
    >
      {children}
      {createPortal(tooltipEl, document.body)}
    </div>
  );
};
