import { Platform } from 'react-native';

// Browsers (and a Vega WebView) have no TV focus engine, so on web the arrow
// keys move DOM focus to the nearest button in that direction. Enter then
// presses the focused button, which react-native-web's Pressable handles.
const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const centre = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

function move(e: KeyboardEvent) {
  const dir = directions[e.key];
  if (!dir) return;
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[role="button"]'));
  if (buttons.length === 0) return;
  e.preventDefault();
  const current = document.activeElement as HTMLElement | null;
  if (!current || !buttons.includes(current)) return buttons[0].focus();

  const from = centre(current);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const button of buttons) {
    if (button === current) continue;
    const to = centre(button);
    const along = (to.x - from.x) * dir[0] + (to.y - from.y) * dir[1];
    if (along <= 0) continue;
    const across = Math.abs((to.x - from.x) * dir[1] + (to.y - from.y) * dir[0]);
    const score = along + 2 * across;
    if (score < bestScore) {
      bestScore = score;
      best = button;
    }
  }
  best?.focus();
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', move);
}
