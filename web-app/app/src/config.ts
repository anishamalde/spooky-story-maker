// Where the audio API lives. On web (including the Vega WebView) it's served
// from the same Vercel deployment as the app, so the default relative path
// just works. Native TV builds have no origin, so set EXPO_PUBLIC_API_URL in
// app/.env to the deployed site, e.g. https://spooky-story-maker.vercel.app
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export const ttsUrl = (storyId: string, page: number) => `${API_URL}/api/tts/${storyId}/${page}`;
export const sfxUrl = (storyId: string, page: number) => `${API_URL}/api/sfx/${storyId}/${page}`;
