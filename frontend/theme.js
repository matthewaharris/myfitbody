// MyFitBody design tokens — "Ember" direction (chosen 2026-07-02).
// Single source of truth for colors/spacing/type. Screens should reference
// these instead of hardcoding values.

export const colors = {
  // brand
  primary: '#FF5A2E',        // ember orange - actions, highlights, links
  primaryDark: '#E04A20',    // pressed states
  primarySoft: '#FFEDE6',    // tinted backgrounds behind primary content
  ink: '#1B2A41',            // deep navy - headings, dark surfaces
  accent: '#FFB020',         // gold - badges, streaks, celebration
  success: '#2FA46B',
  danger: '#D9534F',
  water: '#2E9BDA',          // hydration-specific accent

  // surfaces
  background: '#FAF6F1',     // warm off-white app background
  card: '#FFFFFF',
  border: '#EEE5DA',

  // text
  text: '#1B2A41',
  textSecondary: '#6B6459',
  textMuted: '#A39A8D',
  textOnPrimary: '#FFFFFF',
  textOnInk: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const type = {
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  heading: { fontSize: 18, fontWeight: '600', color: colors.text },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 12, color: colors.textSecondary },
};

export default { colors, spacing, radii, type };
