// Longmont AI — Tailwind theme extension.
// Merge into tailwind.config.{js,ts} under theme.extend.colors.
// Source of truth: src/index.css — these values mirror the running site 1:1.
export const longmontAIColors = {
  la: {
    // Surfaces — Zinc-based dark glass UI
    bgDeep:       '#09090b',
    bgCard:       '#18181b',
    bgCardHover:  '#27272a',

    // Accents — vibrant editorial palette
    sunset:       '#FF9E64',
    pink:         '#FF0080',
    purple:       '#7928CA',
    cyan:         '#00F0FF',
    blue:         '#007CF0',

    // Text
    textPrimary:   '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted:     '#71717A',

    // Glass
    glassBg:        'rgba(24, 24, 27, 0.7)',
    glassBorder:    'rgba(255, 255, 255, 0.08)',
    glassHighlight: 'rgba(255, 255, 255, 0.15)',
  },
} as const;

// Gradient stops for `theme.extend.backgroundImage` / `theme.extend.textColor` use.
export const longmontAIGradients = {
  vibrant:     'linear-gradient(to right, #007CF0 0%, #7928CA 50%, #FF0080 100%)',
  bluePurple:  'linear-gradient(to right, #007CF0, #7928CA)',
  cyanPurple:  'linear-gradient(135deg, #00F0FF, #7928CA)',
  sunsetPink:  'linear-gradient(135deg, #FF9E64, #FF0080)',
} as const;