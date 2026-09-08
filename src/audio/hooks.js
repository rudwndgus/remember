// Optional future audio extension. Keep the shipped prototype silent.
// Create/resume AudioContext only after the remember:start user gesture.
// Subscribe to remember:footstep to play a short, quiet sample when walking.
export function setupAudioHooks() {
  const onStart = () => { /* TODO: resume audio context and fade music in. */ };
  const onStep = () => { /* TODO: play an optional footstep sample. */ };
  window.addEventListener('remember:start', onStart);
  window.addEventListener('remember:footstep', onStep);
  return () => {
    window.removeEventListener('remember:start', onStart);
    window.removeEventListener('remember:footstep', onStep);
  };
}
