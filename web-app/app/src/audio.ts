import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { sounds } from './sounds.generated';

// Two long-lived players for the bundled clips: one loops music quietly,
// the other plays short one-shots (hellos, ambiences, menu sounds).
// The story player makes its own players for the live narration and stings.
let music: AudioPlayer | null = null;
let currentTrack: string | null = null;
let oneShot: AudioPlayer | null = null;

export async function initAudio() {
  await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

export function playClip(name: string) {
  const source = sounds[name];
  if (source === undefined) return;
  if (!oneShot) oneShot = createAudioPlayer(source);
  else oneShot.replace(source);
  oneShot.seekTo(0);
  oneShot.play();
}

export function playMusic(track: 'music-title' | 'music-story', volume: number) {
  const source = sounds[track];
  if (source === undefined) return;
  if (!music) music = createAudioPlayer(source);
  else if (currentTrack !== track) music.replace(source);
  music.loop = true;
  music.volume = volume;
  if (currentTrack !== track) music.seekTo(0);
  currentTrack = track;
  music.play();
}

export function pauseMusic() {
  music?.pause();
}

export function resumeMusic() {
  if (currentTrack) music?.play();
}
