import { StyleSheet, View } from 'react-native';
import { art } from '../content';
import { BigButton, Scene, useScale } from '../ui';

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const s = useScale();
  return (
    <Scene source={art.title}>
      <View style={[styles.button, { top: s(620) }]}>
        <BigButton label="Start" onPress={onStart} preferred />
      </View>
    </Scene>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
