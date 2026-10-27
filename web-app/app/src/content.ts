import storiesFile from './stories.json';

export type Page = { text: string; caption: string; sfx: string };
export type Story = { id: string; title: string; hero: string; place: string; sidekick: string; pages: Page[] };
export type Choice = { id: string; name: string };
export type Picks = { hero?: string; place?: string; sidekick?: string };

export const choices = storiesFile.choices as { heroes: Choice[]; places: Choice[]; sidekicks: Choice[] };
const stories = storiesFile.stories as Record<string, Story>;

export const storyFor = (hero: string, place: string, sidekick: string): Story =>
  stories[`${hero}-${place}-${sidekick}`];

export const art = {
  title: require('../assets/art/title.png'),
  backdrop: require('../assets/art/backdrop.png'),
  theEnd: require('../assets/art/the-end.png'),
  place: {
    house: require('../assets/art/place-house.png'),
    patch: require('../assets/art/place-patch.png'),
    woods: require('../assets/art/place-woods.png'),
  } as Record<string, number>,
  hero: {
    witch: require('../assets/art/hero-witch.png'),
    ghost: require('../assets/art/hero-ghost.png'),
    pumpkin: require('../assets/art/hero-pumpkin.png'),
  } as Record<string, number>,
  sidekick: {
    cat: require('../assets/art/sidekick-cat.png'),
    bat: require('../assets/art/sidekick-bat.png'),
    skeleton: require('../assets/art/sidekick-skeleton.png'),
  } as Record<string, number>,
};
