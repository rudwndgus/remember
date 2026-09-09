// Optional future audio extension. Keep the shipped prototype silent.
// Create/resume AudioContext only after the remember:start user gesture.
// Subscribe to remember:footstep to play a short, quiet sample when walking.
export function emitAudioCue(cue,detail={}) {
  window.dispatchEvent(new CustomEvent('remember:audio',{detail:{cue,...detail}}));
}

export function setupAudioHooks() {
  const onStart = () => { /* TODO: resume audio context and fade music in. */ };
  const onStep = () => { /* TODO: play an optional footstep sample. */ };
  // Optional cues: traffic-ambience, car-passing, bus-engine, bus-braking,
  // bus-door, boarding, bus-interior. Missing audio never blocks game logic.
  const onAmbient = () => { /* TODO: map event.detail.cue to available samples. */ };
  window.addEventListener('remember:start', onStart);
  window.addEventListener('remember:footstep', onStep);
  window.addEventListener('remember:audio', onAmbient);
  return () => {
    window.removeEventListener('remember:start', onStart);
    window.removeEventListener('remember:footstep', onStep);
    window.removeEventListener('remember:audio', onAmbient);
  };
}
