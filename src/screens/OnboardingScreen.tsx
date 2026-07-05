import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');
const PURPLE = '#7C5CFC';
const BG = '#000';
const CARD = '#1C1C1E';
const TEXT = '#fff';
const MUTED = '#888';
const DIM = '#333';
const FLAG = `${FileSystem.documentDirectory}onboarding_done`;

// ─── Waveform bars ────────────────────────────────────────────────────────────
const WAVE_HEIGHTS = [8, 14, 20, 16, 24, 18, 12, 22, 10, 16];

function Waveform({ color = MUTED }: { color?: string }) {
  return (
    <View style={styles.waveform}>
      {WAVE_HEIGHTS.map((h, i) => (
        <View key={i} style={[styles.waveBar, { height: h, backgroundColor: color }]} />
      ))}
    </View>
  );
}

// ─── Icon circle ─────────────────────────────────────────────────────────────
function IconCircle({
  name,
  size = 22,
  color = TEXT,
  bg = '#1a1a1a',
  border = '#2a2a2a',
  diameter = 56,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  bg?: string;
  border?: string;
  diameter?: number;
}) {
  return (
    <View style={[styles.iconCircle, { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

// ─── Page 1 illustration — Capture anything ──────────────────────────────────
const ORBIT_R = 110;
const ICON_D  = 56; // icon circle diameter

// Clockwise from top: angle=0 is 12 o'clock
function orbitPos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: Math.round(ORBIT_R * Math.sin(rad)),
    y: Math.round(-ORBIT_R * Math.cos(rad)),
  };
}

const ORBIT_ITEMS = [
  { name: 'mic' as const,                    angleDeg: 0,   withWave: true,  offsetX: -44 },
  { name: 'camera-outline' as const,         angleDeg: 270, withWave: false, offsetX: 0 },
  { name: 'location-sharp' as const,         angleDeg: 90,  withWave: false, offsetX: 0 },
  { name: 'document-text-outline' as const,  angleDeg: 210, withWave: false, offsetX: 0 },
  { name: 'person-outline' as const,         angleDeg: 150, withWave: false, offsetX: 0 },
];

function Page1Illustration({ active }: { active: boolean }) {
  const centerScale   = useSharedValue(0.7);
  const centerOpacity = useSharedValue(0);
  const itemScales    = ORBIT_ITEMS.map(() => useSharedValue(0));
  const itemOpacities = ORBIT_ITEMS.map(() => useSharedValue(0));

  useEffect(() => {
    if (active) {
      centerScale.value   = withTiming(1, { duration: 400, easing: EASE_OUT });
      centerOpacity.value = withTiming(1, { duration: 400 });
      ORBIT_ITEMS.forEach((_, i) => {
        itemScales[i].value    = withDelay(180 + i * 70, withTiming(1, { duration: 300, easing: EASE_OUT }));
        itemOpacities[i].value = withDelay(180 + i * 70, withTiming(1, { duration: 250 }));
      });
    } else {
      centerScale.value   = 0.7;
      centerOpacity.value = 0;
      ORBIT_ITEMS.forEach((_, i) => { itemScales[i].value = 0; itemOpacities[i].value = 0; });
    }
  }, [active]);

  const centerStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
    transform: [{ scale: centerScale.value }],
  }));

  const itemStyles = ORBIT_ITEMS.map((_, i) =>
    useAnimatedStyle(() => ({
      opacity: itemOpacities[i].value,
      transform: [{ scale: itemScales[i].value }],
    }))
  );

  return (
    <View style={styles.illustrationContainer}>
      {/* Outer dashed ring */}
      <View style={[styles.dashedRing, { width: ORBIT_R * 2 + ICON_D, height: ORBIT_R * 2 + ICON_D, borderRadius: ORBIT_R + ICON_D / 2 }]} />

      {/* Concentric dark circles */}
      <View style={[styles.concentric, { width: 200, height: 200, borderRadius: 100, backgroundColor: '#0d0d0f' }]} />
      <View style={[styles.concentric, { width: 140, height: 140, borderRadius: 70,  backgroundColor: '#111116' }]} />
      <View style={[styles.concentric, { width: 90,  height: 90,  borderRadius: 45,  backgroundColor: '#16161c' }]} />

      {/* Wolf center */}
      <Animated.View style={[styles.concentric, centerStyle]}>
        <Image source={require('@/assets/images/onb.png')} style={{ width: 70, height: 70 }} contentFit="contain" />
      </Animated.View>

      {/* Orbiting icons — outer View positions, inner Animated.View scales */}
      {ORBIT_ITEMS.map((item, i) => {
        const pos = orbitPos(item.angleDeg);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: [
                { translateX: pos.x - ICON_D / 2 + (item.offsetX ?? 0) },
                { translateY: pos.y - ICON_D / 2 },
              ],
            }}
          >
            <Animated.View style={itemStyles[i]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {item.withWave && <Waveform />}
                <IconCircle name={item.name} />
                {item.withWave && <Waveform />}
              </View>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Page 2 illustration — AI connects everything ─────────────────────────────
const NODE_R = 100; // orbit radius for chips

const AI_NODES = [
  { icon: 'mic' as const,            label: 'Voice',    angleDeg: 0   },
  { icon: 'location-sharp' as const, label: 'Location', angleDeg: 270 },
  { icon: 'camera' as const,         label: 'Photo',    angleDeg: 90  },
  { icon: 'person' as const,         label: 'Person',   angleDeg: 150 },
  { icon: 'document-text' as const,  label: 'Note',     angleDeg: 210 },
];

function nodePos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.round(NODE_R * Math.sin(rad)), y: Math.round(-NODE_R * Math.cos(rad)) };
}

// A dashed line from center (0,0) to (x,y) drawn as a thin rotated View
function DashLine({ x, y }: { x: number; y: number }) {
  const length = Math.round(Math.sqrt(x * x + y * y));
  const angle  = Math.atan2(y, x) * (180 / Math.PI);
  return (
    <View
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: length,
        height: 1,
        borderWidth: 0,
        borderTopWidth: 1,
        borderColor: PURPLE + '55',
        borderStyle: 'dashed',
        transformOrigin: 'left center',
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

function Page2Illustration({ active }: { active: boolean }) {
  const centerScale   = useSharedValue(0.6);
  const centerOpacity = useSharedValue(0);
  const nodeScales    = AI_NODES.map(() => useSharedValue(0));
  const nodeOpacities = AI_NODES.map(() => useSharedValue(0));

  useEffect(() => {
    if (active) {
      centerScale.value   = withTiming(1, { duration: 400, easing: EASE_OUT });
      centerOpacity.value = withTiming(1, { duration: 400 });
      AI_NODES.forEach((_, i) => {
        nodeScales[i].value   = withDelay(150 + i * 90, withTiming(1, { duration: 300, easing: EASE_OUT }));
        nodeOpacities[i].value = withDelay(150 + i * 90, withTiming(1, { duration: 250 }));
      });
    } else {
      centerScale.value   = 0.6;
      centerOpacity.value = 0;
      AI_NODES.forEach((_, i) => { nodeScales[i].value = 0; nodeOpacities[i].value = 0; });
    }
  }, [active]);

  const centerStyle = useAnimatedStyle(() => ({
    opacity: centerOpacity.value,
    transform: [{ scale: centerScale.value }],
  }));

  const nodeStyles = AI_NODES.map((_, i) =>
    useAnimatedStyle(() => ({
      opacity: nodeOpacities[i].value,
      transform: [{ scale: nodeScales[i].value }],
    }))
  );

  return (
    <View style={styles.illustrationContainer}>
      {/* Concentric dark circles */}
      <View style={[styles.concentric, { width: 200, height: 200, borderRadius: 100, backgroundColor: '#0d0d14' }]} />
      <View style={[styles.concentric, { width: 130, height: 130, borderRadius: 65,  backgroundColor: '#10101a' }]} />

      {/* Dashed connection lines (behind center) */}
      {AI_NODES.map((node, i) => {
        const pos = nodePos(node.angleDeg);
        return <DashLine key={i} x={pos.x} y={pos.y} />;
      })}

      {/* Center AI brain */}
      <Animated.View style={[styles.concentric, styles.brainCenter, centerStyle]}>
        <Ionicons name="analytics" size={36} color={TEXT} />
      </Animated.View>

      {/* Nodes — same trig pattern as page 1 */}
      {AI_NODES.map((node, i) => {
        const pos = nodePos(node.angleDeg);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: [
                { translateX: pos.x - 36 },
                { translateY: pos.y - 36 },
              ],
            }}
          >
            <Animated.View style={nodeStyles[i]}>
              <View style={styles.aiChip}>
                <View style={styles.aiChipDot}>
                  <Ionicons name={node.icon} size={14} color={PURPLE} />
                </View>
                <Text style={styles.aiChipLabel}>{node.label}</Text>
              </View>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Page 3 illustration — Never lose context again ───────────────────────────
const PHONE_ROWS = [
  { icon: 'mic' as const },
  { icon: 'camera-outline' as const },
  { icon: 'location-sharp' as const },
  { icon: 'person-outline' as const },
  { icon: 'document-text-outline' as const },
];

const ORBIT3 = [
  { name: 'sparkles' as const,      top: -100, left: -20 },
  { name: 'chatbubble-outline' as const, top: 10, left: -130 },
  { name: 'people-outline' as const, top: 10, left: 90 },
  { name: 'calendar-outline' as const, top: 110, left: -130 },
  { name: 'time-outline' as const,  top: 110, left: 90 },
];

function Page3Illustration({ active }: { active: boolean }) {
  const phoneY    = useSharedValue(30);
  const phoneOpacity = useSharedValue(0);
  const orbitScales   = ORBIT3.map(() => useSharedValue(0));
  const orbitOpacities = ORBIT3.map(() => useSharedValue(0));

  useEffect(() => {
    if (active) {
      phoneY.value       = withTiming(0, { duration: 400, easing: EASE_OUT });
      phoneOpacity.value = withTiming(1, { duration: 400 });
      ORBIT3.forEach((_, i) => {
        orbitScales[i].value    = withDelay(180 + i * 70, withTiming(1, { duration: 300, easing: EASE_OUT }));
        orbitOpacities[i].value = withDelay(180 + i * 70, withTiming(1, { duration: 250 }));
      });
    } else {
      phoneY.value        = 30;
      phoneOpacity.value  = 0;
      ORBIT3.forEach((_, i) => { orbitScales[i].value = 0; orbitOpacities[i].value = 0; });
    }
  }, [active]);

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: phoneOpacity.value,
    transform: [{ translateY: phoneY.value }],
  }));

  const orbitStyles = ORBIT3.map((_, i) =>
    useAnimatedStyle(() => ({
      opacity: orbitOpacities[i].value,
      transform: [{ scale: orbitScales[i].value }],
    }))
  );

  return (
    <View style={styles.illustrationContainer}>
      {/* Dashed ring */}
      <View style={[styles.dashedRing, { width: 290, height: 290, borderRadius: 145 }]} />

      {/* Phone mockup */}
      <Animated.View style={[styles.phoneMockup, phoneStyle]}>
        {/* Timeline rows */}
        <View style={styles.phoneTimeline}>
          {PHONE_ROWS.map((row, i) => (
            <View key={i} style={styles.phoneRow}>
              <View style={styles.phoneRowLeft}>
                <View style={styles.phoneRowDot} />
                {i < PHONE_ROWS.length - 1 && <View style={styles.phoneRowLine} />}
              </View>
              <View style={[styles.phoneRowIcon, { marginLeft: 6 }]}>
                <Ionicons name={row.icon} size={10} color={PURPLE} />
              </View>
              <View style={styles.phoneRowBars}>
                <View style={[styles.phonePlaceholderBar, { width: '80%' }]} />
                <View style={[styles.phonePlaceholderBar, { width: '55%' }]} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Page content ─────────────────────────────────────────────────────────────
const PAGES = [
  {
    title: 'Capture\nanything',
    subtitle: 'Voice, photos, places and\nnotes become memories.',
    showPoweredBy: false,
  },
  {
    title: 'AI connects\neverything',
    subtitle: '"Who was I with yesterday?"\nWolfpack connects the dots.',
    showPoweredBy: false,
  },
  {
    title: 'Never lose\ncontext again',
    subtitle: 'Your life, organized and connected.\nAlways at your fingertips.',
    showPoweredBy: true,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  async function finish() {
    await FileSystem.writeAsStringAsync(FLAG, '1').catch(() => {});
    router.replace('/login');
  }

  function next() {
    if (page < 2) {
      scrollRef.current?.scrollTo({ x: W * (page + 1), animated: true });
    } else {
      finish();
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => {
          const p = Math.round(e.nativeEvent.contentOffset.x / W);
          setPage(p);
        }}
        style={{ flex: 1 }}
      >
        {/* Page 1 */}
        <View style={styles.page}>
          <Page1Illustration active={page === 0} />
          <PageText index={0} page={page} />
        </View>

        {/* Page 2 */}
        <View style={styles.page}>
          <Page2Illustration active={page === 1} />
          <PageText index={1} page={page} />
        </View>

        {/* Page 3 */}
        <View style={styles.page}>
          <Page3Illustration active={page === 2} />
          <PageText index={2} page={page} />
        </View>
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === page ? TEXT : DIM }]} />
        ))}
      </View>

      {/* CTA button */}
      <TouchableOpacity style={styles.cta} onPress={next} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{page === 2 ? 'Get Started' : 'Next'}</Text>
        {page === 2 && <Ionicons name="arrow-forward" size={18} color={BG} style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      {/* Powered by */}
      <Text style={styles.poweredBy}>
        Powered by <Text style={styles.cognee}>Cognee</Text>
      </Text>

      <View style={{ height: 12 }} />
    </SafeAreaView>
  );
}

// ─── Page text (animated) ─────────────────────────────────────────────────────
function PageText({ index, page }: { index: number; page: number }) {
  const active = page === index;
  const opacity = useSharedValue(0);
  const y       = useSharedValue(16);

  useEffect(() => {
    if (active) {
      opacity.value = withTiming(1, { duration: 350 });
      y.value       = withTiming(0, { duration: 350, easing: EASE_OUT });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      y.value       = 16;
    }
  }, [active]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={[styles.textBlock, anim]}>
      <Text style={styles.pageTitle}>{PAGES[index].title}</Text>
      <Text style={styles.pageSubtitle}>{PAGES[index].subtitle}</Text>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipText: {
    color: MUTED,
    fontSize: 16,
  },

  // Pages
  page: {
    width: W,
    alignItems: 'center',
    paddingTop: 20,
  },

  // Illustration shared
  illustrationContainer: {
    width: W,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concentric: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: PURPLE + '55',
    borderStyle: 'dashed',
  },
  orbitItem: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Waveform
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
  },

  // Page 2 AI node chips
  aiChip: {
    alignItems: 'center',
    gap: 5,
    width: 72,
  },
  aiChipDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16162a',
    borderWidth: 1,
    borderColor: PURPLE + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiChipLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Page 3 phone
  brainCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: PURPLE + '44',
  },
  phoneMockup: {
    width: 160,
    height: 220,
    borderRadius: 20,
    backgroundColor: '#0e0e14',
    borderWidth: 1.5,
    borderColor: '#2a2a3a',
    padding: 16,
    justifyContent: 'center',
  },
  phoneTimeline: {
    gap: 0,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
  },
  phoneRowLeft: {
    width: 14,
    alignItems: 'center',
  },
  phoneRowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE,
    marginTop: 4,
  },
  phoneRowLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: PURPLE + '44',
    marginTop: 2,
    minHeight: 24,
  },
  phoneRowIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PURPLE + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  phoneRowBars: {
    flex: 1,
    gap: 4,
    paddingLeft: 6,
    paddingTop: 4,
  },
  phonePlaceholderBar: {
    height: 5,
    backgroundColor: '#2a2a3a',
    borderRadius: 3,
  },

  // Text block
  textBlock: {
    paddingHorizontal: 28,
    paddingTop: 20,
    alignItems: 'center',
    width: W,
  },
  pageTitle: {
    color: TEXT,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  pageSubtitle: {
    color: MUTED,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },

  // Navigation
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEXT,
    borderRadius: 999,
    width: W - 80,
    paddingVertical: 14,
  },
  ctaText: {
    color: BG,
    fontSize: 16,
    fontWeight: '700',
  },
  poweredBy: {
    color: '#444',
    fontSize: 13,
    marginTop: 16,
  },
  cognee: {
    color: PURPLE,
    fontWeight: '700',
  },
});
