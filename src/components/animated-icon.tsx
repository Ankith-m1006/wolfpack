import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;
const SPLASH_HOLD_MS = 3800;

const PURPLE = '#7C5CFC';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  // Fade-out overlay
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // Wolf logo: scale up from 0.4 + fade in
  const logoScale   = useSharedValue(0.4);
  const logoOpacity = useSharedValue(0);
  const logoStyle   = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  // Wordmark: slide up + fade in (delayed)
  const textOpacity = useSharedValue(0);
  const textY       = useSharedValue(20);
  const textStyle   = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  // Tagline: same but a bit later
  const tagOpacity = useSharedValue(0);
  const tagY       = useSharedValue(16);
  const tagStyle   = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagY.value }],
  }));

  // Footer: fade in last
  const footerOpacity = useSharedValue(0);
  const footerStyle   = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  useEffect(() => {
    // Logo pops in immediately
    logoScale.value   = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 400 });

    // Wordmark slides up after logo lands
    textOpacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    textY.value       = withDelay(350, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));

    // Tagline shortly after
    tagOpacity.value = withDelay(550, withTiming(1, { duration: 400 }));
    tagY.value       = withDelay(550, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));

    // Footer fades in last
    footerOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));

    // Fade out whole overlay after hold
    const t = setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: DURATION }, (finished) => {
        if (finished) runOnJS(setVisible)(false);
      });
    }, SPLASH_HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splash, screenStyle]}>
      {/* Wolf logo */}
      <Animated.View style={logoStyle}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.wolfLogo}
          contentFit="contain"
        />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text style={[styles.wordmark, textStyle]}>WOLFPACK</Animated.Text>
      <Animated.Text style={[styles.tagline, tagStyle]}>Remember everything.</Animated.Text>

      {/* Spinner */}
      <ActivityIndicator size="large" color="#666" style={styles.spinner} />

      {/* Footer */}
      <Animated.View style={[styles.footer, footerStyle]}>
        <Text style={styles.poweredBy}>
          Powered by <Text style={styles.cognee}>Cognee</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wolfLogo: {
    width: 140,
    height: 140,
    marginBottom: 32,
  },
  wordmark: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tagline: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '400',
  },
  spinner: {
    marginTop: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
  },
  poweredBy: {
    color: '#555',
    fontSize: 14,
    fontWeight: '400',
  },
  cognee: {
    color: PURPLE,
    fontWeight: '700',
  },
});
