import { Image, StyleSheet, Text, View } from 'react-native';
import { playClip } from '../audio';
import { art, Choice } from '../content';
import { colors, fonts, safe } from '../theme';
import { Focusable, Scene, useScale } from '../ui';

export type PickOption = Choice & { image: number; sound: string };

type Props = {
  title: string;
  options: PickOption[];
  // Places show their whole scene; heroes and sidekicks are cutouts.
  variant: 'cutout' | 'scene';
  onPick: (id: string) => void;
};

// The reusable "pick one of three" screen: Left/Right moves focus (the TV
// focus engine does that for us), focus plays the option's sound, Select picks.
export function PickScreen({ title, options, variant, onPick }: Props) {
  const s = useScale();
  const cardW = s(500);
  const cardH = s(560);
  return (
    <Scene source={art.backdrop} dim style={styles.fill}>
      <Text style={[styles.title, { fontSize: s(110), marginBottom: s(60) }]}>{title}</Text>
      <View style={[styles.row, { gap: s(72) }]}>
        {options.map((option, i) => (
          <Focusable
            key={option.id}
            label={option.name}
            preferred={i === 0}
            onFocus={() => playClip(option.sound)}
            onPress={() => {
              playClip('ui-select');
              onPick(option.id);
            }}
            style={{
              width: cardW,
              height: cardH,
              borderRadius: s(40),
              backgroundColor: colors.violet,
              overflow: 'hidden',
              alignItems: 'center',
            }}
          >
            {variant === 'scene' ? (
              <Image source={option.image} style={{ width: cardW, height: s(400) }} resizeMode="cover" />
            ) : (
              <Image source={option.image} style={{ width: s(400), height: s(400) }} resizeMode="contain" />
            )}
            <Text style={[styles.name, { fontSize: s(44), marginTop: s(40) }]}>{option.name}</Text>
          </Focusable>
        ))}
      </View>
    </Scene>
  );
}

const styles = StyleSheet.create({
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: safe.horizontal,
    paddingVertical: safe.vertical,
    backgroundColor: colors.night,
  },
  title: { fontFamily: fonts.display, color: colors.orange, letterSpacing: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: fonts.body, color: colors.cream, textAlign: 'center' },
});
