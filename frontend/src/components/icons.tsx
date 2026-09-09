/** Set ikon inline SVG (stroke = currentColor) — tanpa dependensi icon library. */
import React from 'react';

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function base(children: React.ReactNode, { size = 18, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const GavelIcon = (p: IconProps) =>
  base(
    <>
      <path d="M13 10v4" />
      <path d="M16 7H8l-3 3v2h14v-2l-3-3z" />
      <path d="M12 14v5" />
      <path d="M8 19h8" />
    </>,
    p,
  );

export const ScaleIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M4 7h16" />
      <path d="M5 7l-2.5 6a3.5 3.5 0 0 0 6.5.6L6.5 7" />
      <path d="M19 7l-2.5 6a3.5 3.5 0 0 0 6.5.6L17.5 7" />
      <circle cx="5" cy="5" r="1.4" />
      <circle cx="19" cy="5" r="1.4" />
    </>,
    p,
  );

export const DatabaseIcon = (p: IconProps) =>
  base(
    <>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.6" />
      <path d="M5 5.5v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5" />
      <path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12" />
    </>,
    p,
  );

export const ChartIcon = (p: IconProps) =>
  base(
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 14l3.5-3.5 2.5 2.5L18 8" />
      <path d="M15 8h3v3" />
    </>,
    p,
  );

export const BuildingIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 21V8l7-4 7 4v13" />
      <path d="M2 21h20" />
      <path d="M9 12h2M13 12h2M9 16h2M13 16h2" />
      <path d="M9 21v-4h6v4" />
    </>,
    p,
  );

export const FingerprintIcon = (p: IconProps) =>
  base(
    <>
      <path d="M5.6 19.8A9.5 9.5 0 0 1 7 6.2" />
      <path d="M10.5 21a12 12 0 0 1-1.2-8.8" />
      <path d="M15 20.5A13.5 13.5 0 0 1 14 8" />
      <path d="M19.5 19a16 16 0 0 0-.4-8.6" />
      <path d="M12 12a4.5 4.5 0 0 0 3.2-1.5" />
    </>,
    p,
  );

export const ShieldAlertIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 3l7 2.5V11c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V5.5L12 3z" />
      <path d="M12 8.5v4" />
      <path d="M12 15.6h.01" />
    </>,
    p,
  );

export const BoltIcon = (p: IconProps) =>
  base(
    <>
      <path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z" />
    </>,
    p,
  );

export const RefreshIcon = (p: IconProps) =>
  base(
    <>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 3v4h-4" />
      <path d="M4 12a8 8 0 0 1 8-8" />
      <path d="M20 12a8 8 0 0 1-8 8" />
    </>,
    p,
  );

export const CheckIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 12.5l5 5L20 6.5" />
    </>,
    p,
  );

export const XIcon = (p: IconProps) =>
  base(
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>,
    p,
  );

export const AlertIcon = (p: IconProps) =>
  base(
    <>
      <path d="M10.3 3.8L2.2 17.5a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4.5" />
      <path d="M12 16.6h.01" />
    </>,
    p,
  );

export const ArrowUpIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </>,
    p,
  );

export const ArrowDownIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </>,
    p,
  );

export const ArrowRightIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </>,
    p,
  );

export const LinkIcon = (p: IconProps) =>
  base(
    <>
      <path d="M10 14a4 4 0 0 0 5.6-1l3-3a4 4 0 1 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10a4 4 0 0 0-5.6 1l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5" />
    </>,
    p,
  );

export const RadioIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="9" opacity="0.4" />
    </>,
    p,
  );

export const ClockIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>,
    p,
  );

export const SearchIcon = (p: IconProps) =>
  base(
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20.5 20.5L16 16" />
    </>,
    p,
  );

export const FileIcon = (p: IconProps) =>
  base(
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>,
    p,
  );

export const BookIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5v-16z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5v-16z" />
    </>,
    p,
  );

export const SparkIcon = (p: IconProps) =>
  base(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8l.9 3.1L16 12l-3.1.9L12 16l-.9-3.1L8 12l3.1-.9L12 8z" />
    </>,
    p,
  );

export const MenuIcon = (p: IconProps) =>
  base(
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>,
    p,
  );

export const ChevronDownIcon = (p: IconProps) =>
  base(
    <>
      <path d="M6 9l6 6 6-6" />
    </>,
    p,
  );
