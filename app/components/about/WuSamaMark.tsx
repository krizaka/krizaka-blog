"use client";

import { useId } from "react";

export interface WuSamaMarkProps {
  /** Width and height in pixels. */
  size?: number;
  /** Accessible title (gives the SVG role="img" and aria-label). */
  title?: string;
  className?: string;
}

const SHIELD = "M259.7,134 L259.7,226 L180,272 L100.3,226 L100.3,134 L180,88 L212,106.5";
const W_PATH = "M132,142 L154,216 L180,166 L206,216 L228,142";
const NODE = { cx: 259.7, cy: 134, r: 19, inner: 6 };

/**
 * The Wu-sama mark — the founder's byline mark.
 * It shares Krizaka's hexagonal shield contour and color palette (ink shield, open vertex with lit blue node),
 * with the W rendered in Krizaka blue at the center. Below 48 px it crops to the emblem.
 */
export function WuSamaMark({ size = 32, title, className }: WuSamaMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const inkId = `wsm-ink-${uid}`;
  const blueId = `wsm-blue-${uid}`;
  const glowId = `wsm-glow-${uid}`;

  const isCropped = size < 48;
  const viewBox = isCropped ? "86 82 228 228" : "0 0 400 400";
  const a11yProps = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...a11yProps}
    >
      <defs>
        <linearGradient id={inkId} gradientUnits="userSpaceOnUse" x1={70} y1={290} x2={290} y2={70}>
          <stop offset="0%" stopColor="var(--kz-text-secondary, #64748b)" />
          <stop offset="100%" stopColor="var(--kz-text-primary, #0f172a)" />
        </linearGradient>
        <linearGradient id={blueId} gradientUnits="userSpaceOnUse" x1={180} y1={180} x2={300} y2={60}>
          <stop offset="0%" stopColor="#3e76a8" />
          <stop offset="100%" stopColor="#5696fa" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3e76a8" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#3e76a8" stopOpacity={0} />
        </radialGradient>
      </defs>

      {!isCropped && (
        <>
          <circle cx={200} cy={200} r={190} fill={`url(#${glowId})`} />
          <circle
            cx={200}
            cy={200}
            r={160}
            stroke="var(--kz-border-strong, rgba(0,0,0,0.15))"
            strokeWidth={1.5}
            strokeDasharray="8 8"
            opacity={0.5}
          />
          <circle
            cx={200}
            cy={200}
            r={134}
            stroke="var(--kz-border-default, rgba(0,0,0,0.1))"
            strokeWidth={1}
            opacity={0.3}
          />
        </>
      )}

      <g transform="translate(20 20)">
        <path
          d={SHIELD}
          stroke={`url(#${inkId})`}
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={NODE.cx} cy={NODE.cy} r={NODE.r} fill={`url(#${blueId})`} />
        <circle cx={NODE.cx} cy={NODE.cy} r={NODE.inner} fill="#dbeafe" />
        <path
          d={W_PATH}
          stroke={`url(#${blueId})`}
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
