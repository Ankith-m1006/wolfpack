// TODO: Replace mock data with real fragment list once a /list or
// /datasets/{id}/data endpoint is wired into cognee.ts

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Palette ────────────────────────────────────────────────────────────────
// Backgrounds and neutrals match CaptureScreen / AskScreen exactly.
const BG = '#000';
const CARD = '#1C1C1E';
const TEXT = '#fff';
const MUTED = '#888';
const DIM = '#555';
// Two accents introduced for fragment type differentiation, derived from mockup.
const PURPLE = '#7C5CFC';
const GOLD = '#F5A623';

// ─── Types ───────────────────────────────────────────────────────────────────
type FragmentType = 'voice' | 'photo' | 'location' | 'text';

type Fragment = {
  id: string;
  type: FragmentType;
  timestamp: string;
  // voice
  transcript?: string;
  duration?: string;
  // photo
  title?: string;
  subtitle?: string;
  thumbnailUri?: string;
  // location
  placeName?: string;
  cityCountry?: string;
  // text
  content?: string;
};

type DayGroup = { label: string; fragments: Fragment[] };

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_FRAGMENTS: DayGroup[] = [
  {
    label: 'Today',
    fragments: [
      {
        id: '1',
        type: 'voice',
        timestamp: '9:41 PM',
        transcript: '"Met Doug at Mirage, awesome guy!"',
        duration: '00:12',
      },
      {
        id: '2',
        type: 'photo',
        timestamp: '9:33 PM',
        title: 'Mirage Bar Receipt',
        subtitle: '₹1,250 • Paid via Card',
      },
      {
        id: '3',
        type: 'location',
        timestamp: '9:15 PM',
        placeName: 'Mirage, Koramangala',
        cityCountry: 'Bengaluru, India',
      },
      {
        id: '4',
        type: 'text',
        timestamp: '9:50 PM',
        content: 'Sat with a guy named Doug. Works at Cognee.',
      },
    ],
  },
  {
    label: 'Yesterday',
    fragments: [
      {
        id: '5',
        type: 'voice',
        timestamp: '11:02 PM',
        transcript: '"Walked back home around 12:30 AM. Had a great night."',
        duration: '00:08',
      },
    ],
  },
];

// ─── Waveform ─────────────────────────────────────────────────────────────────
const WAVE_BARS = [
  8, 14, 20, 12, 26, 10, 22, 16, 28, 8,
  18, 24, 12, 20, 10, 26, 14, 22, 8, 18,
  24, 10, 20, 16, 28, 12, 22, 8, 18, 14,
];

function Waveform() {
  return (
    <View style={styles.waveform}>
      {WAVE_BARS.map((h, i) => (
        <View
          key={i}
          style={[
            styles.waveBar,
            { height: h, opacity: i % 3 === 0 ? 1 : 0.4 },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Type meta ───────────────────────────────────────────────────────────────
const TYPE_META: Record<
  FragmentType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  voice:    { label: 'Voice Note',  icon: 'mic',           color: PURPLE },
  photo:    { label: 'Photo (OCR)', icon: 'camera',        color: GOLD   },
  location: { label: 'Location',    icon: 'location-sharp', color: PURPLE },
  text:     { label: 'Text Note',   icon: 'document-text', color: GOLD   },
};

// ─── Icon circle ─────────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: FragmentType }) {
  const meta = TYPE_META[type];
  return (
    <View style={[styles.iconCircle, { borderColor: meta.color }]}>
      <Ionicons name={meta.icon} size={22} color={meta.color} />
    </View>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────
function VoiceCard({ fragment }: { fragment: Fragment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TypeIcon type="voice" />
        <View style={styles.cardMeta}>
          <Text style={[styles.typeLabel, { color: PURPLE }]}>
            {TYPE_META.voice.label}
          </Text>
          <Text style={styles.transcript}>{fragment.transcript}</Text>
        </View>
        <Text style={styles.timestamp}>{fragment.timestamp}</Text>
      </View>
      <View style={styles.voiceFooter}>
        <Waveform />
        <View style={styles.voiceRight}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => console.log('TODO: play audio')}
            activeOpacity={0.7}
          >
            <Ionicons name="play" size={16} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.duration}>{fragment.duration}</Text>
        </View>
      </View>
    </View>
  );
}

function PhotoCard({ fragment }: { fragment: Fragment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TypeIcon type="photo" />
        <View style={styles.cardMeta}>
          <Text style={[styles.typeLabel, { color: GOLD }]}>
            {TYPE_META.photo.label}
          </Text>
          <Text style={styles.mainText}>{fragment.title}</Text>
          {fragment.subtitle && (
            <Text style={styles.subText}>{fragment.subtitle}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.timestamp}>{fragment.timestamp}</Text>
          {fragment.thumbnailUri ? (
            <Image source={{ uri: fragment.thumbnailUri }} style={styles.thumbnail} />
          ) : (
            // Placeholder when no real image exists yet
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="camera-outline" size={20} color={DIM} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function LocationCard({ fragment }: { fragment: Fragment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TypeIcon type="location" />
        <View style={styles.cardMeta}>
          <Text style={[styles.typeLabel, { color: PURPLE }]}>
            {TYPE_META.location.label}
          </Text>
          <Text style={styles.mainText}>{fragment.placeName}</Text>
          {fragment.cityCountry && (
            <Text style={styles.subText}>{fragment.cityCountry}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.timestamp}>{fragment.timestamp}</Text>
          {fragment.thumbnailUri ? (
            <Image source={{ uri: fragment.thumbnailUri }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="map-outline" size={20} color={DIM} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function TextCard({ fragment }: { fragment: Fragment }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TypeIcon type="text" />
        <View style={styles.cardMeta}>
          <Text style={[styles.typeLabel, { color: GOLD }]}>
            {TYPE_META.text.label}
          </Text>
          <Text style={styles.mainText}>{fragment.content}</Text>
        </View>
        <Text style={styles.timestamp}>{fragment.timestamp}</Text>
      </View>
    </View>
  );
}

function FragmentCard({ fragment }: { fragment: Fragment }) {
  if (fragment.type === 'voice')    return <VoiceCard fragment={fragment} />;
  if (fragment.type === 'photo')    return <PhotoCard fragment={fragment} />;
  if (fragment.type === 'location') return <LocationCard fragment={fragment} />;
  return <TextCard fragment={fragment} />;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
const MEMORY_COUNT = 8;

export default function MemoryScreen() {
  const router = useRouter();

  // fragments is a separate variable so swapping in a real API response is one line.
  const fragments: DayGroup[] = MOCK_FRAGMENTS;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Memory pill */}
        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={16} color={TEXT} />
            <Text style={styles.pillText}>{MEMORY_COUNT} Memories Today</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>YOUR MEMORY</Text>
        <Text style={styles.subtext}>
          All your captured fragments, organized in one place.
        </Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            placeholderTextColor={DIM}
            onChangeText={q => console.log('search:', q)}
          />
          <Ionicons name="options-outline" size={20} color={MUTED} />
        </View>

        {/* Fragment groups */}
        {fragments.map(group => (
          <View key={group.label}>
            <Text style={styles.sectionHeader}>{group.label}</Text>
            <View style={styles.cardList}>
              {group.fragments.map(f => (
                <FragmentCard key={f.id} fragment={f} />
              ))}
            </View>
          </View>
        ))}

        {/* Bottom padding so FAB doesn't overlap last card */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating "+" button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={BG} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  pillRow: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '500',
  },
  heading: {
    color: TEXT,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtext: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    marginVertical: 4,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    paddingVertical: 0,
  },
  sectionHeader: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#111',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainText: {
    color: TEXT,
    fontSize: 15,
    lineHeight: 21,
  },
  subText: {
    color: MUTED,
    fontSize: 13,
  },
  transcript: {
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timestamp: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Voice card
  voiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
  voiceRight: {
    alignItems: 'center',
    gap: 4,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
