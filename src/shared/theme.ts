/** Shared visual tokens. Motion Core V1 dark theme (pure UI reskin). */

export const colors = {
  background: '#041B3D',
  surface: '#0D274A',
  border: '#1B5B91',
  text: '#FFFFFF',
  textMuted: '#9BB3D1',
  primary: '#00E5FF',
  primaryPressed: '#0EA5FF',
  onPrimary: '#041B3D',
  danger: '#FF6B6B',
  dangerSoft: '#402129',
  accentSoft: '#123A63',
  warningSoft: '#3A2E12',
  warningText: '#FFC857',
  success: '#00D4A6',
  /** Rounded icon-tile background (teal tile behind cyan glyphs). */
  iconTile: '#0C3D63',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
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
