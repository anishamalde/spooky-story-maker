// Generates the pre-made audio once and writes it to app/assets/sounds/:
// hero hellos (one voice each), sidekick sounds, place ambiences, menu sounds,
// The End sting and two music tracks. Story narration and page stings are NOT
// made here: the proxy generates those live on every play.
//
// Usage: ELEVENLABS_API_KEY=... npx tsx scripts/make-sounds.ts [--force]
// Hero voices with no voiceId in content/voices.json are created with Voice
// Design first, and their new IDs are saved back to that file.
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'app/assets/sounds');
const voicesPath = join(root, 'content/voices.json');
const force = process.argv.includes('--force');

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error('Set ELEVENLABS_API_KEY');
const elevenlabs = new ElevenLabsClient({ apiKey });

const snippets = JSON.parse(readFileSync(join(root, 'content/snippets.json'), 'utf8'));
const voices = JSON.parse(readFileSync(voicesPath, 'utf8'));

async function save(name: string, make: () => Promise<ReadableStream<Uint8Array>>) {
  const file = join(outDir, `${name}.mp3`);
  if (existsSync(file) && !force) {
    console.log(`skip  ${name} (exists, use --force to remake)`);
    return;
  }
  try {
    const audio = Buffer.from(await new Response(await make()).arrayBuffer());
    writeFileSync(file, audio);
    console.log(`wrote ${name}.mp3 (${Math.round(audio.length / 1024)} KB)`);
  } catch (err) {
    // Keep going, so one failed clip (or a feature the plan lacks) doesn't block the rest.
    failed.push(name);
    console.log(`FAIL  ${name}: ${describe(err)}`);
  }
}

const failed: string[] = [];
const describe = (err: unknown) => (err as any)?.body?.detail?.message ?? (err as Error)?.message ?? String(err);

async function heroVoice(heroId: string): Promise<string | null> {
  const voice = voices[heroId];
  if (voice.voiceId) return voice.voiceId;
  console.log(`designing a voice for ${heroId}...`);
  try {
    return await designVoice(heroId, voice);
  } catch (err) {
    failed.push(`voice-${heroId}`);
    console.log(`FAIL  voice for ${heroId}: ${describe(err)}`);
    return null;
  }
}

async function designVoice(heroId: string, voice: { voiceId: string; design: string }) {
  const { previews } = await elevenlabs.textToVoice.design({
    voiceDescription: voice.design,
    autoGenerateText: true,
  });
  const created = await elevenlabs.textToVoice.create({
    voiceName: `Spooky Story Maker: ${snippets.heroes[heroId].name}`,
    voiceDescription: voice.design,
    generatedVoiceId: previews[0].generatedVoiceId,
  });
  voice.voiceId = created.voiceId;
  writeFileSync(voicesPath, JSON.stringify(voices, null, 2) + '\n');
  return created.voiceId;
}

const sfx = (text: string, durationSeconds: number, loop = false) => () =>
  elevenlabs.textToSoundEffects.convert({ text, durationSeconds, loop, outputFormat: 'mp3_44100_128' });

mkdirSync(outDir, { recursive: true });

for (const [id, hero] of Object.entries<any>(snippets.heroes)) {
  const voiceId = await heroVoice(id);
  if (!voiceId) continue;
  await save(`hello-${id}`, () =>
    elevenlabs.textToSpeech.convert(voiceId, {
      text: hero.hello,
      modelId: 'eleven_v4',
      outputFormat: 'mp3_44100_128',
    }),
  );
}

for (const [id, sidekick] of Object.entries<any>(snippets.sidekicks)) {
  await save(`hello-${id}`, sfx(sidekick.hello_sfx, 1.5));
}

const ambiences: Record<string, string> = {
  house: 'a creaky old wooden door slowly opening, cartoon, spooky but friendly',
  patch: 'night crickets chirping in a moonlit field',
  woods: 'gentle spooky wind whooshing through trees, leaves whispering',
};
for (const [id, text] of Object.entries(ambiences)) {
  await save(`ambience-${id}`, sfx(text, 2));
}

await save('ui-move', sfx('a tiny soft magical blip, UI sound, cute', 0.5));
await save('ui-select', sfx('a bright magical sparkle chime, UI confirm sound, cute', 1));
await save('ui-back', sfx('a soft low cartoon whoop going down, UI back sound', 0.6));
await save('spellbook', sfx('an old spellbook creaking open with a magical sparkle shimmer', 2));
await save('the-end', sfx('a cheeky cartoon witch cackle then children giggling, short', 2.5));

await save('music-title', () =>
  elevenlabs.music.compose({
    prompt:
      'Spooky-cute Halloween theme for a kids TV app. Playful pizzicato strings, celesta, harpsichord and a bouncy tuba, light and mischievous, never scary. Loops cleanly.',
    musicLengthMs: 45_000,
    forceInstrumental: true,
  }),
);
await save('music-story', () =>
  elevenlabs.music.compose({
    prompt:
      'Very quiet, gentle bedtime-story underscore for a kids Halloween tale. Soft celesta and music box, warm pads, slow and calm, sits under narration, no drums. Loops cleanly.',
    musicLengthMs: 60_000,
    forceInstrumental: true,
  }),
);

// The app imports this map, so it only ever requires clips that exist.
const names = readdirSync(outDir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)).sort();
writeFileSync(
  join(root, 'app/src/sounds.generated.ts'),
  '// Written by scripts/make-sounds.ts. Do not edit.\n' +
    'export const sounds: Record<string, number> = {\n' +
    names.map((n) => `  '${n}': require('../assets/sounds/${n}.mp3'),\n`).join('') +
    '};\n',
);
if (failed.length) console.log(`\n${failed.length} failed: ${failed.join(', ')}. Fix and run again; finished clips are skipped.`);
console.log('Done. Commit app/assets/sounds/ and app/src/sounds.generated.ts so the app bundles them.');
