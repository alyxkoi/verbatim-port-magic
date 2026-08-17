// Icon paths ported verbatim from alyxlab-console.html (ICON_PATHS).
import type { ReactNode } from "react";

export const ICON_PATHS: Record<string, ReactNode> = {
  today: (
    <>
      <path d="M4 5.5h16v14H4z" />
      <path d="M8 3v5M16 3v5M4 10h16" />
    </>
  ),
  leads: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M16 11h6M19 8v6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 9h18" />
      <path d="M8 13h2M14 13h2M8 17h2" />
    </>
  ),
  plans: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h7M9 17h5" />
    </>
  ),
  links: (
    <>
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),
  clients: (
    <>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M16.5 15.5a3.5 3.5 0 0 1 3.5 3.5v2" />
      <circle cx="17" cy="8" r="2.5" />
    </>
  ),
  blip: (
    <>
      <path d="M12 3a6 6 0 0 1 6 6c0 2.4-1.4 3.7-2.3 5-0.6.9-.7 1.7-.7 2.6H9c0-.9-.1-1.7-.7-2.6C7.4 12.7 6 11.4 6 9a6 6 0 0 1 6-6z" />
      <path d="M10 20h4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  spark: (
    <>
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z" />
      <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>
  ),
};

export function Icon({ name, label = "" }: { name: string; label?: string }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      aria-hidden={label ? "false" : "true"}
      {...(label ? { "aria-label": label } : {})}
    >
      {ICON_PATHS[name] ?? ICON_PATHS["spark"]}
    </svg>
  );
}
