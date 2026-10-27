// Colours from the Claude Design scene art.
export const colors = {
  night: '#1B1640',
  deep: '#120E2E',
  violet: '#7C4DDB',
  orange: '#F28C28',
  gold: '#FFD66B',
  cream: '#FFF4D6',
  lime: '#9BE15D',
};

// About 5% of a 1920×1080 screen on each side, so nothing sits outside the TV safe area.
export const safe = { horizontal: '5%', vertical: '5%' } as const;

export const fonts = {
  display: 'Creepster_400Regular',
  body: 'Fredoka_600SemiBold',
};
