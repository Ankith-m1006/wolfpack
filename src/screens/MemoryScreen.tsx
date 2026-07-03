import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listFragments, type Fragment, type FragmentType } from '@/services/cognee';

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
type DayGroup = { label: string; fragments: Fragment[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupByDay(fragments: Fragment[]): DayGroup[] {
  const map = new Map<string, Fragment[]>();
  for (const f of fragments) {
    const label = dayLabel(f.createdAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(f);
  }
  return Array.from(map.entries()).map(([label, frags]) => ({ label, fragments: frags }));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Type meta ───────────────────────────────────────────────────────────────
const TYPE_META: Record<
  FragmentType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  photo: { label: 'Photo', icon: 'camera',        color: GOLD   },
  text:  { label: 'Note',  icon: 'document-text', color: GOLD   },
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
function FragmentCard({ fragment }: { fragment: Fragment }) {
  const meta = TYPE_META[fragment.type];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TypeIcon type={fragment.type} />
        <View style={styles.cardMeta}>
          <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
          {fragment.type === 'photo' ? (
            <Text style={styles.subText}>{fragment.name}</Text>
          ) : (
            <Text style={styles.mainText}>{fragment.preview || '—'}</Text>
          )}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.timestamp}>{formatTime(fragment.createdAt)}</Text>
          {fragment.type === 'photo' && (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="camera-outline" size={20} color={DIM} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function MemoryScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFragments()
      .then(frags => setGroups(groupByDay(frags)))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load memories.'))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = groups.reduce((n, g) => n + g.fragments.length, 0);

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
            <Text style={styles.pillText}>{totalCount} Memories</Text>
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

        {/* States */}
        {loading && (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        )}
        {error && !loading && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        {!loading && !error && groups.length === 0 && (
          <Text style={styles.emptyText}>No memories yet — start capturing!</Text>
        )}

        {/* Fragment groups */}
        {groups.map(group => (
          <View key={group.label}>
            <Text style={styles.sectionHeader}>{group.label}</Text>
            <View style={styles.cardList}>
              {group.fragments.map(f => (
                <FragmentCard key={f.id} fragment={f} />
              ))}
            </View>
          </View>
        ))}

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
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
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
