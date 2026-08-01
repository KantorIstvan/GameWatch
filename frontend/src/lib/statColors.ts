// Fixed categorical assignment (dataviz stat-accent palette, see tokens.css) — one
// hue per bento-tile identity, never reassigned by rank/value. Shared by the
// Statistics page's top KPI grid and its game-record tiles so both draw from the
// same seven-color set.
export const statColors = {
  blue: 'var(--color-stat-blue)',
  orange: 'var(--color-stat-orange)',
  aqua: 'var(--color-stat-aqua)',
  yellow: 'var(--color-stat-yellow)',
  magenta: 'var(--color-stat-magenta)',
  green: 'var(--color-stat-green)',
  violet: 'var(--color-stat-violet)',
} as const

export const statForegrounds = {
  blue: 'var(--color-stat-blue-foreground)',
  orange: 'var(--color-stat-orange-foreground)',
  aqua: 'var(--color-stat-aqua-foreground)',
  yellow: 'var(--color-stat-yellow-foreground)',
  magenta: 'var(--color-stat-magenta-foreground)',
  green: 'var(--color-stat-green-foreground)',
  violet: 'var(--color-stat-violet-foreground)',
} as const
