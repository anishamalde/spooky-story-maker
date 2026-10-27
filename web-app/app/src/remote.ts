import { useEffect, useRef } from 'react';
import { BackHandler, Platform, TVEventControl, useTVEventHandler } from 'react-native';

export type RemoteKey = 'select' | 'playPause' | 'left' | 'right' | 'up' | 'down';

const webKeys: Record<string, RemoteKey> = {
  Enter: 'select',
  ' ': 'playPause',
  MediaPlayPause: 'playPause', // TV remotes in a WebView (e.g. Vega)
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

// Remote buttons other than Back. On web (handy for quick checks in a
// browser) the keyboard stands in: arrows, Enter, Space.
export const useRemote: (onKey: (key: RemoteKey) => void) => void =
  Platform.OS === 'web'
    ? (onKey) => {
        const ref = useRef(onKey);
        ref.current = onKey;
        useEffect(() => {
          const listener = (e: KeyboardEvent) => {
            const key = webKeys[e.key];
            if (key) ref.current(key);
          };
          window.addEventListener('keydown', listener);
          return () => window.removeEventListener('keydown', listener);
        }, []);
      }
    : (onKey) => {
        const ref = useRef(onKey);
        ref.current = onKey;
        useTVEventHandler((evt) => {
          // Android TV sends key down (0) and key up (1); act once, on key up.
          if (evt.eventKeyAction === 0) return;
          ref.current(evt.eventType as RemoteKey);
        });
      };

// Back (Android TV) and Menu (Apple TV). Return true when handled. On the
// title screen pass null, so Back leaves the app as TV users expect.
export function useBack(onBack: (() => void) | null) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!onBack) {
      if (Platform.isTV && Platform.OS === 'ios') TVEventControl.disableTVMenuKey();
      return;
    }
    if (Platform.isTV && Platform.OS === 'ios') TVEventControl.enableTVMenuKey();
    if (Platform.OS === 'web') {
      const listener = (e: KeyboardEvent) => {
        // Escape/Backspace on a keyboard; GoBack/BrowserBack from a TV remote in a WebView.
        if (['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(e.key)) ref.current?.();
      };
      window.addEventListener('keydown', listener);
      return () => window.removeEventListener('keydown', listener);
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current?.();
      return true;
    });
    return () => sub.remove();
  }, [onBack === null]);
}
