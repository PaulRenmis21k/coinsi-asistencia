// Pitidos de confirmación generados con WebAudio. Cada caso usa un tono distinto.

let context = null;

const PATTERNS = {
  success: [
    { frequency: 784, duration: 0.09, delay: 0 },
    { frequency: 1175, duration: 0.14, delay: 0.1 },
  ],
  warning: [
    { frequency: 659, duration: 0.1, delay: 0 },
    { frequency: 523, duration: 0.18, delay: 0.11 },
  ],
  error: [{ frequency: 196, duration: 0.28, delay: 0, type: 'sawtooth' }],
};

export function playAlert(kind, enabled = true) {
  if (!enabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    context = context || new AudioContextClass();
    if (context.state === 'suspended') context.resume();

    const now = context.currentTime;
    const pattern = PATTERNS[kind] || PATTERNS.success;

    pattern.forEach((step) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + step.delay;
      const end = start + step.duration;

      oscillator.type = step.type || 'sine';
      oscillator.frequency.setValueAtTime(step.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    });
  } catch (error) {
    // El audio es opcional: si el navegador lo bloquea, no interrumpimos el registro.
    console.warn('No se pudo reproducir el sonido:', error);
  }
}
