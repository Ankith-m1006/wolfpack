import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import { listFragments, remember, rememberPhoto } from '@/services/cognee';
const BTN = 200;
const BORDER = 3;
const PURPLE = '#7C5CFC';
const BAR_COUNT = 5;

type RecordState = 'idle' | 'priming' | 'recording' | 'paused';

const DIAL_ITEMS = [
  {
    key: 'photo',
    icon: 'camera-outline' as const,
    label: 'PHOTO',
    toX: -135,
    toY: -20,
  },
  {
    key: 'place',
    icon: 'location-sharp' as const,
    label: 'PLACE',
    toX: 135,
    toY: -20,
  },
];

function formatTime(s: number) {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Audio waveform + timer shown during recording ────────────────────────────
function AudioPulse({
  barAnims,
  elapsed,
  paused,
}: {
  barAnims: Animated.Value[];
  elapsed: number;
  paused: boolean;
}) {
  return (
    <View style={apStyles.wrap}>
      <View style={apStyles.bars}>
        {barAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              apStyles.bar,
              { opacity: paused ? 0.35 : 1, transform: [{ scaleY: anim }] },
            ]}
          />
        ))}
      </View>
      <Text style={apStyles.timer}>{formatTime(elapsed)}</Text>
    </View>
  );
}

const apStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 48 },
  bar: { width: 5, height: 48, borderRadius: 3, backgroundColor: PURPLE },
  timer: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
});

// ─── Progress ring (two-half technique) ──────────────────────────────────────
function ProgressRing({ progress }: { progress: Animated.Value }) {
  const rotateRight = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['45deg', '225deg', '225deg'],
  });
  const rotateLeft = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['45deg', '45deg', '225deg'],
  });

  return (
    <View style={styles.ringWrapper} pointerEvents="none">
      <View style={styles.halfClipRight}>
        <Animated.View
          style={[styles.arc, styles.arcRight, { transform: [{ rotate: rotateRight }] }]}
        />
      </View>
      <View style={styles.halfClipLeft}>
        <Animated.View
          style={[styles.arc, styles.arcLeft, { transform: [{ rotate: rotateLeft }] }]}
        />
      </View>
    </View>
  );
}

export default function CaptureScreen() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showTick, setShowTick] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);

  const [memoryCount, setMemoryCount] = useState(0);

  const transcriptRef = useRef<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const primingAnim = useRef(new Animated.Value(0)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3)),
  ).current;

  const tickAnim = useRef(new Animated.Value(0)).current;
  const centerOpacity = useRef(new Animated.Value(1)).current;
  const primingRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const barLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const primingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dialAnims = useRef(DIAL_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    listFragments().then(f => setMemoryCount(f.length)).catch(() => {});
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      Animated.timing(centerOpacity, { toValue: 0, duration: 150, useNativeDriver: true })
        .start(() => setKeyboardVisible(true));
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      Animated.timing(centerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);


  // ── Speech recognition events ───────────────────────────────────────────────
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (text) transcriptRef.current = text;
  });

  // Android auto-stops after silence — restart if still in recording state
  useSpeechRecognitionEvent('end', () => {
    if (recordState === 'recording') {
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    }
  });

  // ── Speed dial ──────────────────────────────────────────────────────────────
  function openDial() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(true);
    Animated.stagger(
      40,
      dialAnims.map(a =>
        Animated.timing(a, { toValue: 1, duration: 250, useNativeDriver: true }),
      ),
    ).start();
  }

  function closeDial() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel(
      dialAnims.map(a =>
        Animated.timing(a, { toValue: 0, duration: 180, useNativeDriver: true }),
      ),
    ).start(() => setExpanded(false));
  }

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer() {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }

  function pauseTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function resetTimer() {
    pauseTimer();
    setElapsed(0);
  }

  // ── Waveform bars ───────────────────────────────────────────────────────────
  function startBars() {
    barAnims.forEach(a => a.setValue(0.3));
    barLoopRef.current = Animated.parallel(
      barAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1,    duration: 180 + i * 90, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.15, duration: 180 + i * 90, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    barLoopRef.current.start();
  }

  function stopBars(freeze = false) {
    barLoopRef.current?.stop();
    barLoopRef.current = null;
    if (!freeze) {
      barAnims.forEach(a =>
        Animated.timing(a, { toValue: 0.3, duration: 200, useNativeDriver: true }).start(),
      );
    }
  }

  // ── Pulse ───────────────────────────────────────────────────────────────────
  function startPulse() {
    pulseAnim.setValue(1);
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    );
    pulseRef.current.start();
  }

  function stopPulse() {
    pulseRef.current?.stop();
    pulseRef.current = null;
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  // ── Lock into recording ─────────────────────────────────────────────────────
  async function lockIntoRecording() {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('Microphone permission required — please enable in settings.');
      setRecordState('idle');
      Animated.timing(primingAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      return;
    }

    transcriptRef.current = '';
    console.log('[voice] starting speech recognition...');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    console.log('[voice] recognition started');

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeDial();
    setRecordState('recording');
    startPulse();
    startBars();
    startTimer();
    Animated.timing(controlsAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  // ── Press handlers ──────────────────────────────────────────────────────────
  function handlePressIn() {
    if (recordState !== 'idle') return;
    // 1s grace window — quick taps cancel before priming starts
    primingDelayRef.current = setTimeout(() => {
      primingDelayRef.current = null;
      setRecordState('priming');
      Haptics.selectionAsync();
      primingAnim.setValue(0);
      primingRef.current = Animated.timing(primingAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      });
      primingRef.current.start(({ finished }) => {
        if (finished) lockIntoRecording();
      });
      // Tick at 1s into the 2s priming window
      setTimeout(() => {
        if (primingRef.current) Haptics.selectionAsync();
      }, 1000);
    }, 1000);
  }

  function handlePressOut() {
    if (primingDelayRef.current) {
      clearTimeout(primingDelayRef.current);
      primingDelayRef.current = null;
    }
    if (recordState !== 'priming') return;
    primingRef.current?.stop();
    primingRef.current = null;
    setRecordState('idle');
    Animated.timing(primingAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }

  // ── Recording controls ──────────────────────────────────────────────────────
  function handlePause() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[voice] pausing recognition');
    ExpoSpeechRecognitionModule.stop();
    setRecordState('paused');
    stopPulse();
    stopBars(true);
    pauseTimer();
  }

  function handleResume() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[voice] resuming recognition');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    setRecordState('recording');
    startPulse();
    startBars();
    startTimer();
  }

  async function handleStop() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    primingRef.current?.stop();
    primingRef.current = null;
    stopPulse();
    stopBars();
    resetTimer();
    setRecordState('idle');
    Animated.parallel([
      Animated.timing(controlsAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(primingAnim,  { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    ExpoSpeechRecognitionModule.stop();
    const transcript = transcriptRef.current.trim();
    transcriptRef.current = '';
    console.log('[voice] transcript:', transcript);

    setVoiceUploading(true);
    setError(null);
    try {
      if (!transcript) throw new Error('No speech detected — please try again.');
      // Invisible marker so completeness scoring can distinguish voice captures from typed text.
      await remember(`[voice] ${transcript}`);
      console.log('[voice] transcript saved to Cognee');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showTickAnimation();
    } catch (e) {
      console.error('[voice] error:', e instanceof Error ? e.message : e);
      setError(e instanceof Error ? e.message : 'Failed to save voice note.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setVoiceUploading(false);
    }
  }

  function showTickAnimation() {
    setShowTick(true);
    tickAnim.setValue(0);
    Animated.spring(tickAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }).start();
    setTimeout(() => {
      Animated.timing(tickAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => setShowTick(false));
    }, 1300);
  }

  // ── Text submit ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await remember(trimmed);
      setText('');
      setSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaceCapture() {
    setPlaceLoading(true);
    setError(null);
    setSuccess(false);
    closeDial();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required — please enable in settings.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const parts = [geo.name, geo.street, geo.district, geo.city, geo.country]
        .filter(Boolean)
        .join(', ');
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const text = `Location captured: ${parts} at ${time}`;
      await remember(text);
      setSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture location.');
    } finally {
      setPlaceLoading(false);
    }
  }

  async function handlePhotoCapture() {
    console.log('[photo] handlePhotoCapture called');
    setPhotoLoading(true);
    setError(null);
    setSuccess(false);
    closeDial();
    try {
      console.log('[photo] requesting permission...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('[photo] permission status:', status);
      if (status !== 'granted') {
        setError('Camera permission required — please enable in settings.');
        return;
      }
      console.log('[photo] launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      console.log('[photo] launchCameraAsync result:', JSON.stringify(result));
      if (result.canceled) return;
      const uri = result.assets[0].uri;
      console.log('[photo] captured, uri:', uri);
      await rememberPhoto(uri);
      console.log('[photo] successfully saved to Cognee');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      console.error('[photo] error:', e instanceof Error ? e.message : e);
      setError(e instanceof Error ? e.message : 'Failed to save photo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPhotoLoading(false);
    }
  }

  const canSend = text.trim().length > 0 && !loading;
  const isActive = recordState !== 'idle';
  const showAudioUI = recordState === 'recording' || recordState === 'paused';

  const labelOpacity = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <SafeAreaView style={styles.safe}>
      {expanded && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDial} />
      )}

      <View style={[styles.container, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.pillText}>{memoryCount} Memories</Text>
          </View>
          <Text style={styles.heading}>CAPTURE YOUR DAY</Text>
          <Text style={styles.subtext}>
            Mumble a thought, take a photo, mark a place. Fast, seamless memory.
          </Text>
        </View>

        {/* Center section — fades out when keyboard opens */}
        {!keyboardVisible && <Animated.View style={[styles.centerSection, { opacity: centerOpacity }]}>
          <View style={styles.dialContainer}>
            {/* Speed-dial items */}
            {DIAL_ITEMS.map((item, i) => {
              const anim = dialAnims[i];
              return (
                <Animated.View
                  key={item.key}
                  pointerEvents={expanded ? 'auto' : 'none'}
                  style={[
                    styles.dialItem,
                    {
                      opacity: anim,
                      transform: [
                        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, item.toX] }) },
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, item.toY] }) },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.sideButton,
                      ((item.key === 'place' && placeLoading) || (item.key === 'photo' && photoLoading)) && styles.sideButtonDisabled,
                    ]}
                    onPress={item.key === 'place' ? handlePlaceCapture : handlePhotoCapture}
                    disabled={(item.key === 'place' && placeLoading) || (item.key === 'photo' && photoLoading)}
                    activeOpacity={0.7}
                  >
                    {(item.key === 'place' && placeLoading) || (item.key === 'photo' && photoLoading)
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name={item.icon} size={26} color="#fff" />
                    }
                    <Text style={styles.sideButtonLabel}>{item.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {/* Pulsing wrapper: center button + ring */}
            <Animated.View style={[styles.btnGroup, { transform: [{ scale: pulseAnim }] }]}>
              <Pressable
                style={[styles.centerButton, isActive && styles.centerButtonActive]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={!isActive ? (expanded ? closeDial : openDial) : undefined}
                android_disableSound
              >
                {showTick ? (
                  <Animated.View style={{ transform: [{ scale: tickAnim }], opacity: tickAnim }}>
                    <Ionicons name="checkmark" size={56} color="#4CAF50" />
                  </Animated.View>
                ) : showAudioUI ? (
                  <AudioPulse
                    barAnims={barAnims}
                    elapsed={elapsed}
                    paused={recordState === 'paused'}
                  />
                ) : (
                  <Ionicons
                    name="hand-right-outline"
                    size={56}
                    color={recordState === 'priming' ? PURPLE : '#fff'}
                  />
                )}
              </Pressable>

              <ProgressRing progress={primingAnim} />
            </Animated.View>
          </View>

          {/* Pause / Stop controls */}
          <Animated.View
            style={[styles.controlsRow, { opacity: controlsAnim }]}
            pointerEvents={isActive ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={styles.controlButton}
              onPress={recordState === 'paused' ? handleResume : handlePause}
              activeOpacity={0.7}
            >
              <Ionicons
                name={recordState === 'paused' ? 'play' : 'pause'}
                size={20}
                color="#fff"
              />
              <Text style={styles.controlLabel}>
                {recordState === 'paused' ? 'RESUME' : 'PAUSE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStop}
              disabled={voiceUploading}
              activeOpacity={0.7}
            >
              {voiceUploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="stop" size={20} color="#fff" />}
              <Text style={styles.controlLabel}>{voiceUploading ? 'SAVING...' : 'STOP'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Hint labels — fade out when controls appear */}
          <Animated.View style={[styles.hintBlock, { opacity: labelOpacity }]}>
            <Text style={styles.tapLabel}>TAP TO ADD A PHOTO OR A PLACE</Text>
            <Text style={styles.holdLabel}>
              {recordState === 'priming' ? 'KEEP HOLDING...' : 'HOLD 1s TO RECORD VOICE NOTE'}
            </Text>
          </Animated.View>
        </Animated.View>}

        <View style={styles.inputWrapper}>
          {success && <Text style={styles.successText}>✓ Saved</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Or type a quick note..."
              placeholderTextColor="#555"
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!loading}
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color={canSend ? '#fff' : '#444'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  inputWrapper: { alignSelf: 'stretch', gap: 6 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Header
  header: { alignItems: 'center', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  heading: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtext: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // Center section
  centerSection: { alignItems: 'center', gap: 20 },
  dialContainer: {
    width: BTN,
    height: BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialItem: { position: 'absolute' },
  btnGroup: { width: BTN, height: BTN },

  // Progress ring
  ringWrapper: { position: 'absolute', width: BTN, height: BTN },
  halfClipRight: {
    position: 'absolute',
    width: BTN / 2,
    height: BTN,
    left: BTN / 2,
    overflow: 'hidden',
  },
  halfClipLeft: {
    position: 'absolute',
    width: BTN / 2,
    height: BTN,
    left: 0,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: BORDER,
  },
  arcRight: {
    left: -BTN / 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: PURPLE,
    borderLeftColor: PURPLE,
  },
  arcLeft: {
    left: 0,
    borderTopColor: PURPLE,
    borderRightColor: PURPLE,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  // Buttons
  sideButton: {
    width: 72,
    height: 72,
    backgroundColor: '#1C1C1E',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sideButtonDisabled: { opacity: 0.5 },
  sideButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerButton: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  centerButtonActive: { borderColor: '#555', backgroundColor: '#222' },

  // Recording controls
  controlsRow: { flexDirection: 'row', gap: 16 },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  stopButton: { backgroundColor: '#3A1C1C' },
  controlLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hintBlock: { alignItems: 'center', gap: 6 },
  tapLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  holdLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Text input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignSelf: 'stretch',
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 10 },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#1C1C1E' },
  successText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#FF5252', fontSize: 13, textAlign: 'center' },
});
