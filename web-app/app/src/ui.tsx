import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors, fonts } from './theme';
import './webFocus';

// Layout is designed at 1920×1080. Android TV usually reports 960×540 dp and
// Apple TV 1920×1080 pt, so every size goes through this scale.
export function useScale() {
  const { width } = useWindowDimensions();
  const k = width / 1920;
  return (px: number) => Math.round(px * k);
}

// A full-screen 16:9 picture with content on top. Sized from the window
// rather than flex, so it covers the screen the same way on every platform.
export function Scene({ source, dim, style, children }: { source: number; dim?: boolean; style?: ViewStyle; children?: ReactNode }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <Image
        source={source}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: dim ? 0.6 : 1 }}
      />
      {children}
    </View>
  );
}

function useFocusPop() {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 30 }).start();
  return {
    focused,
    scale,
    onFocus: () => {
      setFocused(true);
      to(1.08);
    },
    onBlur: () => {
      setFocused(false);
      to(1);
    },
  };
}

type FocusProps = {
  onPress: () => void;
  onFocus?: () => void;
  preferred?: boolean;
  style?: ViewStyle;
  children: ReactNode;
  label: string;
};

// Anything focusable from the couch: a strong gold glow and a scale-up.
export function Focusable({ onPress, onFocus, preferred, style, children, label }: FocusProps) {
  const s = useScale();
  const pop = useFocusPop();
  const ref = useRef<View>(null);
  // hasTVPreferredFocus does nothing on web, so focus the preferred button ourselves.
  useEffect(() => {
    if (Platform.OS === 'web' && preferred) (ref.current as unknown as HTMLElement | null)?.focus();
  }, []);
  return (
    <Pressable
      ref={ref}
      style={styles.noOutline}
      accessibilityRole="button"
      accessibilityLabel={label}
      hasTVPreferredFocus={preferred}
      onPress={onPress}
      onFocus={() => {
        pop.onFocus();
        onFocus?.();
      }}
      onBlur={pop.onBlur}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: pop.scale }],
            borderWidth: s(8),
            borderColor: pop.focused ? colors.gold : 'transparent',
            shadowColor: colors.gold,
            shadowOpacity: pop.focused ? 0.9 : 0,
            shadowRadius: s(40),
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function BigButton({ label, onPress, preferred }: { label: string; onPress: () => void; preferred?: boolean }) {
  const s = useScale();
  return (
    <Focusable
      label={label}
      onPress={onPress}
      preferred={preferred}
      style={{
        backgroundColor: colors.orange,
        borderRadius: s(60),
        paddingHorizontal: s(72),
        paddingVertical: s(24),
      }}
    >
      <Text style={[styles.buttonText, { fontSize: s(56) }]}>{label}</Text>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  // The gold glow shows focus, so hide the browser's own focus ring.
  noOutline: Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : {},
  buttonText: { fontFamily: fonts.body, color: colors.deep, textAlign: 'center' },
});
