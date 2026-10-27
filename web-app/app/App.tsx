import { Creepster_400Regular } from '@expo-google-fonts/creepster/400Regular';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { initAudio, playClip, playMusic } from './src/audio';
import { art, choices, Picks, storyFor } from './src/content';
import { useBack } from './src/remote';
import { EndScreen } from './src/screens/EndScreen';
import { PickOption, PickScreen } from './src/screens/PickScreen';
import { StoryPlayer } from './src/screens/StoryPlayer';
import { TitleScreen } from './src/screens/TitleScreen';
import { colors } from './src/theme';

type Screen = 'title' | 'hero' | 'place' | 'sidekick' | 'story' | 'end';

// Six screens in a straight line; Back always goes one step towards Title.
const backTo: Record<Screen, Screen | null> = {
  title: null,
  hero: 'title',
  place: 'hero',
  sidekick: 'place',
  story: 'sidekick',
  end: 'title',
};

const heroes: PickOption[] = choices.heroes.map((c) => ({ ...c, image: art.hero[c.id], sound: `hello-${c.id}` }));
const places: PickOption[] = choices.places.map((c) => ({ ...c, image: art.place[c.id], sound: `ambience-${c.id}` }));
const sidekicks: PickOption[] = choices.sidekicks.map((c) => ({ ...c, image: art.sidekick[c.id], sound: `hello-${c.id}` }));

export default function App() {
  const [fontsLoaded] = useFonts({ Creepster_400Regular, Fredoka_600SemiBold });
  const [screen, setScreen] = useState<Screen>('title');
  const [picks, setPicks] = useState<Picks>({});
  const [playCount, setPlayCount] = useState(0); // remounts the player on Replay
  const pickedAt = useRef(0);

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    if (screen !== 'story') playMusic('music-title', 0.5);
  }, [screen]);

  const back = backTo[screen];
  useBack(
    back
      ? () => {
          playClip('ui-back');
          setScreen(backTo[screen]!);
        }
      : null,
  );

  if (!fontsLoaded) return <View style={styles.root} />;

  const playStory = () => {
    pickedAt.current = Date.now();
    setPlayCount((n) => n + 1);
    setScreen('story');
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {screen === 'title' && (
        <TitleScreen
          onStart={() => {
            playClip('ui-select');
            setPicks({});
            setScreen('hero');
          }}
        />
      )}
      {screen === 'hero' && (
        <PickScreen
          key="hero"
          title="Pick a hero"
          options={heroes}
          variant="cutout"
          onPick={(hero) => {
            setPicks({ hero });
            setScreen('place');
          }}
        />
      )}
      {screen === 'place' && (
        <PickScreen
          key="place"
          title="Pick a place"
          options={places}
          variant="scene"
          onPick={(place) => {
            setPicks((p) => ({ ...p, place }));
            setScreen('sidekick');
          }}
        />
      )}
      {screen === 'sidekick' && (
        <PickScreen
          key="sidekick"
          title="Pick a sidekick"
          options={sidekicks}
          variant="cutout"
          onPick={(sidekick) => {
            setPicks((p) => ({ ...p, sidekick }));
            playStory();
          }}
        />
      )}
      {screen === 'story' && picks.hero && picks.place && picks.sidekick && (
        <StoryPlayer
          key={playCount}
          story={storyFor(picks.hero, picks.place, picks.sidekick)}
          pickedAt={pickedAt.current}
          onDone={() => setScreen('end')}
        />
      )}
      {screen === 'end' && (
        <EndScreen
          onReplay={playStory}
          onAnother={() => {
            setPicks({});
            setScreen('hero');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
});
