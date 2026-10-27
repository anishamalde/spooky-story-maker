import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { playClip } from '../audio';
import { art } from '../content';
import { BigButton, Scene, useScale } from '../ui';

export function EndScreen({ onReplay, onAnother }: { onReplay: () => void; onAnother: () => void }) {
  const s = useScale();
  useEffect(() => playClip('the-end'), []);
  return (
    <Scene source={art.theEnd}>
      <View style={[styles.buttons, { top: s(680), gap: s(80) }]}>
        <BigButton label="Replay" onPress={onReplay} preferred />
        <BigButton label="Make Another" onPress={onAnother} />
      </View>
    </Scene>
  );
}

const styles = StyleSheet.create({
  buttons: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
});
