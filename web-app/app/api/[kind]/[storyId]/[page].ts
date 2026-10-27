// Spooky Story Maker audio API: the only thing that holds the ElevenLabs key.
// It accepts a story ID and a page number, never free text, so nobody can
// use the key to voice arbitrary words.
//
//   GET /api/tts/{storyId}/{page}  the page's narration (mp3)
//   GET /api/sfx/{storyId}/{page}  the sting that plays after the page (mp3)
//
// The stories are fixed, so each clip only needs making once. The first
// request for a clip generates it and saves it to Vercel Blob; every request
// after that is redirected to the saved copy. That caps what the key can ever
// spend at one generation per clip (27 stories x 5 pages x 2 = 270 clips).
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { BlobNotFoundError, head, put } from '@vercel/blob';
import { waitUntil } from '@vercel/functions';
import storiesFile from '../../../src/stories.json';

type Page = { text: string; caption: string; sfx: string };
const stories = (storiesFile as { stories: Record<string, { pages: Page[] }> }).stories;

const NARRATOR_VOICE_ID = process.env.NARRATOR_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb'; // "George"
const TTS_MODEL = process.env.TTS_MODEL || 'eleven_v4'; // reads audio tags like [whispers]
const SFX_SECONDS = Number(process.env.SFX_SECONDS) || 2.5;
// Without a Blob store (e.g. local dev before `vercel env pull`), every request generates live.
const cacheEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Saved clips never change, so browsers and Vercel's CDN can keep them for a year.
const FOREVER = 'public, max-age=31536000, s-maxage=31536000, immutable';

const error = (status: number, message: string) => Response.json({ error: message }, { status });

export async function GET(request: Request): Promise<Response> {
  const match = new URL(request.url).pathname.match(/^\/api\/(tts|sfx)\/([a-z]+-[a-z]+-[a-z]+)\/([1-9])$/);
  if (!match) return error(404, 'Not found');
  const [, kind, storyId, pageParam] = match;

  const page = stories[storyId]?.pages[Number(pageParam) - 1];
  if (!page) return error(404, 'No such story or page');

  // The voice, model and length are in the path, so changing them makes fresh clips.
  const path =
    kind === 'tts'
      ? `tts/${NARRATOR_VOICE_ID}/${TTS_MODEL}/${storyId}/${pageParam}.mp3`
      : `sfx/${SFX_SECONDS}s/${storyId}/${pageParam}.mp3`;

  if (cacheEnabled) {
    try {
      const saved = await head(path);
      return new Response(null, { status: 302, headers: { Location: saved.url, 'Cache-Control': FOREVER } });
    } catch (err) {
      if (!(err instanceof BlobNotFoundError)) console.error('blob head', path, err);
    }
  }

  // Narration streams: the TV gets the first bytes as ElevenLabs makes them,
  // and a copy is saved to Blob alongside. Stings are short, so they're made whole.
  if (kind === 'tts') {
    let stream: ReadableStream<Uint8Array>;
    try {
      stream = await narrationStream(page);
    } catch (err) {
      console.error(kind, storyId, pageParam, err);
      return error(502, 'ElevenLabs request failed');
    }
    const [toListener, toBlob] = stream.tee();
    if (cacheEnabled) {
      waitUntil(
        put(path, toBlob, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'audio/mpeg' }).catch(
          (err) => console.error('blob put', path, err),
        ),
      );
    } else {
      toBlob.cancel();
    }
    return new Response(toListener, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': cacheEnabled ? FOREVER : 'no-store' },
    });
  }

  let audio: Buffer;
  try {
    audio = await generateSting(page);
  } catch (err) {
    console.error(kind, storyId, pageParam, err);
    return error(502, 'ElevenLabs request failed');
  }

  if (cacheEnabled) {
    try {
      await put(path, audio, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'audio/mpeg' });
    } catch (err) {
      console.error('blob put', path, err); // still play it, just don't save it
    }
  }

  return new Response(new Uint8Array(audio), {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': cacheEnabled ? FOREVER : 'no-store' },
  });
}

function elevenLabsClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  return new ElevenLabsClient({ apiKey });
}

async function narrationStream(page: Page): Promise<ReadableStream<Uint8Array>> {
  return elevenLabsClient().textToSpeech.stream(NARRATOR_VOICE_ID, {
    text: page.text,
    modelId: TTS_MODEL,
    outputFormat: 'mp3_44100_128',
  });
}

async function generateSting(page: Page): Promise<Buffer> {
  const stream = await elevenLabsClient().textToSoundEffects.convert({
    text: page.sfx,
    durationSeconds: SFX_SECONDS,
    outputFormat: 'mp3_44100_128',
  });
  return Buffer.from(await new Response(stream).arrayBuffer());
}
