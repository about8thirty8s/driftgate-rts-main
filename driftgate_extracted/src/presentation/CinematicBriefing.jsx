/**
 * CinematicBriefing.jsx
 * Fullscreen mission briefing overlay — renders before the game canvas mounts.
 *
 * Props:
 *   slides: [{ portrait, portraitLabel, title, subtitle, body, atmosphere }]
 *   onComplete: () => void  — called after last slide is dismissed
 *
 * Slide atmosphere:
 *   'dark'   → near-black bg, gold accents (default)
 *   'bright' → desaturated light — reserved for victory
 *
 * Controls: click anywhere, or press Space / Enter / ArrowRight to advance.
 * No audio. No animation beyond CSS fade.
 */

import React, { useState, useEffect, useCallback } from 'react';

const ATMOSPHERES = {
  dark: {
    bg:        'radial-gradient(ellipse at center, #0a100a 0%, #030703 100%)',
    border:    'rgba(180,150,60,0.35)',
    accent:    '#c9a84c',
    text:      '#d4c9a0',
    subtitle:  '#7a6a3a',
    dim:       'rgba(0,0,0,0.85)',
  },
  bright: {
    bg:        'radial-gradient(ellipse at center, #1a1e14 0%, #0a0d08 100%)',
    border:    'rgba(120,180,80,0.35)',
    accent:    '#8cbf5a',
    text:      '#c8d4b0',
    subtitle:  '#5a7a3a',
    dim:       'rgba(0,0,0,0.75)',
  },
};

export default function CinematicBriefing({ slides = [], onComplete }) {
  const [index,   setIndex]   = useState(0);
  const [fadeIn,  setFadeIn]  = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const current = slides[index];
  const theme   = ATMOSPHERES[current?.atmosphere ?? 'dark'] ?? ATMOSPHERES.dark;
  const isLast  = index === slides.length - 1;

  const advance = useCallback(() => {
    if (fadeOut) return;

    if (isLast) {
      setFadeOut(true);
      setTimeout(() => onComplete?.(), 420);
      return;
    }

    // Fade out current, fade in next
    setFadeIn(false);
    setTimeout(() => {
      setIndex(i => i + 1);
      setFadeIn(true);
    }, 180);
  }, [isLast, fadeOut, onComplete]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e) => {
      if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  if (!current) {
    onComplete?.();
    return null;
  }

  return (
    <div
      onClick={advance}
      style={{
        position:   'fixed',
        inset:       0,
        background:  theme.bg,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        cursor:     'pointer',
        userSelect: 'none',
        zIndex:      9999,
        opacity:     fadeOut ? 0 : 1,
        transition:  fadeOut ? 'opacity 0.4s ease' : 'none',
      }}
    >
      {/* Subtle scan-line texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        zIndex: 1,
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        zIndex: 1,
      }} />

      {/* Card */}
      <div
        style={{
          position:   'relative',
          zIndex:      2,
          display:    'flex',
          gap:         40,
          maxWidth:    860,
          width:      '90vw',
          padding:    '44px 52px',
          background:  theme.dim,
          border:     `1px solid ${theme.border}`,
          borderRadius: 4,
          boxShadow:  `0 0 80px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.3)`,
          opacity:    fadeIn ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        {/* Portrait */}
        <div style={{
          flexShrink: 0,
          width: 110,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 88, height: 88,
            border: `2px solid ${theme.border}`,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            background: 'rgba(0,0,0,0.4)',
            boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)`,
          }}>
            {current.portrait ?? '🪖'}
          </div>
          {current.portraitLabel && (
            <div style={{
              fontSize: 9,
              letterSpacing: 3,
              color: theme.accent,
              textAlign: 'center',
              lineHeight: 1.4,
            }}>
              {current.portraitLabel}
            </div>
          )}
          {/* Slide counter dots */}
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            {slides.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5,
                borderRadius: '50%',
                background: i === index ? theme.accent : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        </div>

        {/* Text content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header rule */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4,
          }}>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
            <div style={{ fontSize: 9, letterSpacing: 5, color: theme.accent }}>
              CLASSIFIED BRIEFING
            </div>
            <div style={{ flex: 1, height: 1, background: theme.border }} />
          </div>

          {/* Title */}
          <div style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 4,
            color: '#ffffff',
            textShadow: `0 0 20px ${theme.accent}55`,
            lineHeight: 1.1,
          }}>
            {current.title}
          </div>

          {/* Subtitle */}
          {current.subtitle && (
            <div style={{
              fontSize: 10,
              letterSpacing: 4,
              color: theme.subtitle,
              marginBottom: 6,
            }}>
              {current.subtitle}
            </div>
          )}

          {/* Body rule */}
          <div style={{ height: 1, background: theme.border, opacity: 0.5 }} />

          {/* Body */}
          <div style={{
            fontSize: 14,
            lineHeight: 1.85,
            color: theme.text,
            flex: 1,
            paddingTop: 4,
          }}>
            {current.body}
          </div>

          {/* Advance prompt */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${theme.border}`,
          }}>
            <div style={{
              fontSize: 9,
              letterSpacing: 3,
              color: theme.accent,
              opacity: 0.7 + 0.3 * Math.round(Date.now() / 800 % 2), // pseudo-blink via re-render won't work — static is fine
            }}>
              {isLast ? '[ CLICK TO DEPLOY ]' : '[ CLICK TO CONTINUE ]'}
            </div>
            <div style={{
              fontSize: 16,
              color: theme.accent,
              opacity: 0.8,
            }}>
              {isLast ? '▶' : '›'}
            </div>
          </div>
        </div>
      </div>

      {/* Slide number absolute */}
      <div style={{
        position: 'absolute', bottom: 24, right: 32, zIndex: 2,
        fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.15)',
      }}>
        {index + 1} / {slides.length}
      </div>
    </div>
  );
}
