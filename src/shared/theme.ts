/** Shared visual tokens. Kept tiny on purpose (Constitution §3.1). */

export const colors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#DDE3EC',
  text: '#111827',
  textMuted: '#5B6472',
  primary: '#1D6FE0',
  primaryPressed: '#1557B0',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  dangerSoft: '#FDECEA',
  accentSoft: '#E8F0FE',
  warningSoft: '#FEF3C7',
  warningText: '#8A5B00',
  success: '#1B7F5A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
} as const;

/** Android accessibility guidance: primary targets are at least 48dp. */
export const MIN_TOUCH_SIZE = 48;

export const fontSizes = {
  display: 44,
  title: 22,
  section: 17,
  body: 16,
  meta: 14,
} as const;
