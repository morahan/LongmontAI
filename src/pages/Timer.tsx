import { createElement } from 'react';
import '../components/hourglass/hourglass-timer';

// Hourglass timer from the SandTimer bake-off (Timer 3 · Opus5.5), a self-contained web component.
export default function Timer() {
  return (
    <section className="flex flex-col items-center gap-6 py-12" aria-labelledby="timer-title">
      <h1 id="timer-title" className="text-4xl font-bold">Hourglass Timer</h1>
      {createElement('hourglass-timer', {
        duration: '5',
        sound: 'true',
        warning: 'true',
        'chime-src': '/sounds/chime.wav',
        'gong-src': '/sounds/gong.mp3',
        style: { width: 'min(300px, 100%)' },
      })}
      <p className="text-xs text-[var(--text-secondary)] text-center max-w-md">
        Sounds: “Night Mode Gentle Chime” and “Resonant Gong Strike” by BudgetPixel AI, CC BY 4.0.
      </p>
    </section>
  );
}
