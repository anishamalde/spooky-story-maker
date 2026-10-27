import { AudioPlayer, AudioStatus, createAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { pauseMusic, playClip, playMusic, resumeMusic } from '../audio';
import { sfxUrl, ttsUrl } from '../config';
import { art, Story } from '../content';
import { useRemote } from '../remote';
import { colors, fonts, safe } from '../theme';
import { Scene, useScale } from '../ui';

const SPELLBOOK_MIN_MS = 1500;
const START_TIMEOUT_MS = 20_000; // narration that hasn't started by now counts as failed
const STING_TIMEOUT_MS = 6_000; // a sting that never finishes doesn't block the story

type Part = 'narration' | 'sting';

type Props = {
  story: Story;
  pickedAt: number; // when the sidekick was picked, for the picks-to-first-audio number
  onDone: () => void;
};

// Plays a story page by page: live narration from /tts, then the live sting
// from /sfx, with the music bed underneath. All five stings are requested as
// soon as the story opens; each page's narration is requested while the
// page before it plays.
export function StoryPlayer({ story, pickedAt, onDone }: Props) {
  const s = useScale();
  const pages = story.pages.length;
  const [page, setPage] = useState(0);
  const [opening, setOpening] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstAudioMs, setFirstAudioMs] = useState<number | null>(null);

  const narration = useRef<(AudioPlayer | undefined)[]>([]);
  const stings = useRef<AudioPlayer[]>([]);
  const step = useRef<{ page: number; part: Part }>({ page: 0, part: 'narration' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(false);
  const started = useRef<boolean[]>([]);
  const openedAt = useRef(Date.now());

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const current = () => {
    const { page: p, part } = step.current;
    return part === 'narration' ? narration.current[p] : stings.current[p];
  };

  const finish = () => {
    if (done.current) return;
    done.current = true;
    clearTimer();
    current()?.pause();
    onDone();
  };

  const narrationFor = (p: number) => {
    if (!narration.current[p]) {
      const player = createAudioPlayer({ uri: ttsUrl(story.id, p + 1) });
      player.addListener('playbackStatusUpdate', (st) => onStatus('narration', p, st));
      narration.current[p] = player;
    }
    return narration.current[p]!;
  };

  const startPage = (p: number) => {
    if (p >= pages) return finish();
    clearTimer();
    step.current = { page: p, part: 'narration' };
    setPage(p);
    narrationFor(p).play();
    if (p + 1 < pages) narrationFor(p + 1); // prefetch the next page
    timer.current = setTimeout(() => setError('The narrator didn’t answer. Try again in a moment.'), START_TIMEOUT_MS);
  };

  const startSting = (p: number) => {
    clearTimer();
    step.current = { page: p, part: 'sting' };
    const sting = stings.current[p];
    if (sting) {
      sting.seekTo(0);
      sting.play();
    }
    timer.current = setTimeout(() => startPage(p + 1), STING_TIMEOUT_MS);
  };

  const onStatus = (part: Part, p: number, st: AudioStatus) => {
    const now = step.current;
    if (done.current || now.page !== p || now.part !== part) return;
    if (st.error) {
      if (part === 'narration') setError(`The narrator got stuck: ${st.error}`);
      else startPage(p + 1);
      return;
    }
    if (part === 'narration' && st.playing && !started.current[p]) {
      started.current[p] = true;
      clearTimer(); // it started, so the start timeout is done
      if (p === 0) {
        const ms = Date.now() - pickedAt;
        console.log(`[timing] picks to first narration audio: ${ms} ms`);
        setFirstAudioMs(ms);
        const wait = Math.max(0, SPELLBOOK_MIN_MS - (Date.now() - openedAt.current));
        setTimeout(() => setOpening(false), wait);
      }
    }
    if (st.didJustFinish) {
      if (part === 'narration') startSting(p);
      else startPage(p + 1);
    }
  };

  useEffect(() => {
    playClip('spellbook');
    playMusic('music-story', 0.15);
    stings.current = story.pages.map((_, p) => {
      const player = createAudioPlayer({ uri: sfxUrl(story.id, p + 1) });
      player.addListener('playbackStatusUpdate', (st) => onStatus('sting', p, st));
      return player;
    });
    startPage(0);
    return () => {
      done.current = true;
      clearTimer();
      [...narration.current, ...stings.current].forEach((player) => player?.remove());
    };
  }, []);

  const togglePause = () => {
    if (error) return;
    const player = current();
    const { page: p, part } = step.current;
    if (paused) {
      player?.play();
      resumeMusic();
      if (part === 'sting') timer.current = setTimeout(() => startPage(p + 1), STING_TIMEOUT_MS);
    } else {
      clearTimer();
      player?.pause();
      pauseMusic();
    }
    setPaused(!paused);
  };

  useRemote((key) => {
    if (key === 'playPause' || key === 'select') togglePause();
    if (key === 'right' && !paused && !opening) {
      current()?.pause();
      startPage(step.current.page + 1);
    }
  });

  if (opening || error) return <Spellbook error={error} />;

  return (
    <Scene source={art.place[story.place]}>
      <Bobbing style={{ position: 'absolute', left: s(140), bottom: s(250) }} delay={0}>
        <Image source={art.hero[story.hero]} style={{ width: s(620), height: s(620) }} />
      </Bobbing>
      <Bobbing style={{ position: 'absolute', left: s(700), bottom: s(250) }} delay={700}>
        <Image source={art.sidekick[story.sidekick]} style={{ width: s(420), height: s(420) }} />
      </Bobbing>

      <View style={[styles.captionBox, { left: '5%', right: '5%', bottom: s(54), padding: s(28), borderRadius: s(28) }]}>
        <Text style={[styles.caption, { fontSize: s(42), lineHeight: s(56) }]}>{story.pages[page].caption}</Text>
        <View style={[styles.dots, { marginTop: s(16), gap: s(16) }]}>
          {story.pages.map((_, i) => (
            <View
              key={i}
              style={{
                width: s(22),
                height: s(22),
                borderRadius: s(11),
                backgroundColor: i === page ? colors.orange : i < page ? colors.cream : 'rgba(255,244,214,0.3)',
              }}
            />
          ))}
        </View>
      </View>

      {paused && (
        <View style={styles.pausedOverlay}>
          <Text style={[styles.paused, { fontSize: s(120) }]}>Paused</Text>
          <Text style={[styles.hint, { fontSize: s(40) }]}>Press Play to keep listening</Text>
        </View>
      )}
      {__DEV__ && firstAudioMs !== null && (
        <Text style={[styles.debug, { fontSize: s(24), top: s(30), right: s(60) }]}>first audio {firstAudioMs} ms</Text>
      )}
    </Scene>
  );
}

function Bobbing({ children, style, delay }: { children: React.ReactNode; style: object; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, { toValue: -12, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[style, { transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

// "Opening the spellbook": a book that swings open while page 1 loads.
function Spellbook({ error }: { error: string | null }) {
  const s = useScale();
  const open = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(open, { toValue: 1, duration: 1100, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    Animated.loop(Animated.timing(sparkle, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const coverW = s(300);
  const coverH = s(400);
  const rotateY = open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-160deg'] });
  const spin = sparkle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: colors.night }]}>
      <Animated.View
        style={{ width: s(56), height: s(56), marginBottom: s(50), backgroundColor: colors.gold, borderRadius: s(8), transform: [{ rotate: spin }] }}
      />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: coverW, height: coverH, backgroundColor: colors.cream, borderRadius: s(12) }} />
        <View style={{ width: coverW, height: coverH, backgroundColor: colors.cream, borderRadius: s(12) }} />
        {/* The front cover hinges on the spine (the middle), so it pivots from its left edge. */}
        <Animated.View
          style={{
            position: 'absolute',
            left: coverW,
            width: coverW,
            height: coverH,
            backgroundColor: colors.violet,
            borderRadius: s(12),
            borderWidth: s(8),
            borderColor: colors.gold,
            transform: [
              { perspective: 1200 },
              { translateX: -coverW / 2 },
              { rotateY },
              { translateX: coverW / 2 },
            ],
          }}
        />
      </View>
      <Text style={[styles.hint, { fontSize: s(52), marginTop: s(50) }]}>
        {error ?? 'Opening the spellbook...'}
      </Text>
      {error && <Text style={[styles.hint, { fontSize: s(36), marginTop: s(20), opacity: 0.7 }]}>Press Back to try again</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: safe.horizontal },
  captionBox: { position: 'absolute', backgroundColor: 'rgba(18,14,46,0.82)' },
  caption: { fontFamily: fonts.body, color: colors.cream, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(18,14,46,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paused: { fontFamily: fonts.display, color: colors.orange },
  hint: { fontFamily: fonts.body, color: colors.cream, textAlign: 'center' },
  debug: { position: 'absolute', fontFamily: fonts.body, color: colors.lime },
});
