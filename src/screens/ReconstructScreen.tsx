import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getGraph,
  listFragments,
  type Fragment,
  type GraphData,
  type GraphNode,
} from '@/services/cognee';

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG     = '#000';
const CARD   = '#1C1C1E';
const TEXT   = '#fff';
const MUTED  = '#888';
const PURPLE = '#7C5CFC';
const GOLD   = '#F5A623';

const HANDLE_W = 16;

// ─── Types ───────────────────────────────────────────────────────────────────
type FragmentType = 'photo' | 'text';

type TimelineFragment = {
  id: string;
  type: FragmentType;
  timestamp: string;
  column: 'primary' | 'secondary';
  content: string;
  entities: string[];
};

type TimelineMoment = {
  id: string;
  time: string;
  dotColor: 'gold' | 'purple';
  fragments: TimelineFragment[];
};

// ─── Type meta ───────────────────────────────────────────────────────────────
const TYPE_META: Record<
  FragmentType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  photo: { label: 'Photo',     icon: 'camera',        color: GOLD },
  text:  { label: 'Text Note', icon: 'document-text', color: GOLD },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildTimeline(graph: GraphData, fragments: Fragment[]): TimelineMoment[] {
  const { nodes, edges } = graph;
  const byId = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
  const fragByName = new Map<string, Fragment>(fragments.map(f => [f.name, f]));

  const outEdges = new Map<string, string[]>();
  const inEdges  = new Map<string, string[]>();
  for (const e of edges) {
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e.target);
    if (!inEdges.has(e.target)) inEdges.set(e.target, []);
    inEdges.get(e.target)!.push(e.source);
  }

  const textDocs = nodes.filter(n => n.type === 'TextDocument');
  if (textDocs.length === 0) return [];

  const moments: TimelineMoment[] = [];

  for (const doc of textDocs) {
    const docName = (doc.properties?.document_name as string | undefined) ?? doc.label ?? '';
    const frag = fragByName.get(docName);
    const createdAt = frag?.createdAt ?? new Date(0);

    const chunkIds = [
      ...(outEdges.get(doc.id) ?? []),
      ...(inEdges.get(doc.id)  ?? []),
    ].filter(id => byId.get(id)?.type === 'DocumentChunk');

    let preview = '';
    const entitySet = new Set<string>();
    for (const chunkId of chunkIds) {
      const chunk = byId.get(chunkId);
      if (!preview && chunk) {
        const rawText = (chunk.properties?.text as string | undefined) ?? '';
        preview = rawText.replace(/<!--.*?-->/gs, '').trim().slice(0, 120);
      }
      for (const nId of [...(outEdges.get(chunkId) ?? []), ...(inEdges.get(chunkId) ?? [])]) {
        const n = byId.get(nId);
        if (n?.type === 'Entity') entitySet.add(n.label);
      }
    }

    const isPhoto = docName.startsWith('photo_');
    const type: FragmentType = isPhoto ? 'photo' : 'text';
    const content = isPhoto ? (frag?.name ?? docName) : (preview || frag?.preview || '—');

    moments.push({
      id: doc.id,
      time: formatTime(createdAt),
      dotColor: isPhoto ? 'gold' : 'purple',
      fragments: [{
        id: doc.id, type, timestamp: formatTime(createdAt),
        column: 'primary', content, entities: Array.from(entitySet).slice(0, 5),
      }],
    });
  }

  moments.sort((a, b) => {
    const docA = textDocs.find(d => d.id === a.id);
    const docB = textDocs.find(d => d.id === b.id);
    const fa = fragByName.get((docA?.properties?.document_name as string) ?? '');
    const fb = fragByName.get((docB?.properties?.document_name as string) ?? '');
    return (fa?.createdAt.getTime() ?? 0) - (fb?.createdAt.getTime() ?? 0);
  });

  return moments;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: FragmentType }) {
  const meta = TYPE_META[type];
  return (
    <View style={[styles.iconCircle, { borderColor: meta.color }]}>
      <Ionicons name={meta.icon} size={14} color={meta.color} />
    </View>
  );
}

function DashedConnector() {
  return (
    <View style={styles.dashCol}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.dashSegment} />
      ))}
    </View>
  );
}

function FragmentCard({ fragment }: { fragment: TimelineFragment }) {
  const meta = TYPE_META[fragment.type];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <TypeIcon type={fragment.type} />
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <Text style={styles.mainText} numberOfLines={3}>{fragment.content}</Text>
      {fragment.entities.length > 0 && (
        <View style={styles.chipsRow}>
          {fragment.entities.map(e => (
            <View key={e} style={styles.chip}>
              <Text style={styles.chipText}>#{e}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.cardTime}>{fragment.timestamp}</Text>
    </View>
  );
}

function MomentRow({ moment, isFirst, isLast }: { moment: TimelineMoment; isFirst: boolean; isLast: boolean }) {
  const dotColor = moment.dotColor === 'gold' ? GOLD : PURPLE;
  const primary   = moment.fragments.filter(f => f.column === 'primary');
  const secondary = moment.fragments.filter(f => f.column === 'secondary');
  const hasConnector = primary.length > 0 && secondary.length > 0;

  return (
    <View style={styles.momentRow}>
      <View style={styles.timestampCol}>
        <Text style={styles.timeText}>{moment.time}</Text>
      </View>
      <View style={styles.timelineCol}>
        {!isFirst && <View style={styles.lineSegment} />}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.lineSegment} />}
      </View>
      <View style={styles.contentCol}>
        <View style={styles.cardsRow}>
          <View style={styles.primaryCol}>
            {primary.map(f => <FragmentCard key={f.id} fragment={f} />)}
          </View>
          {hasConnector && <View style={styles.connectorCol}><DashedConnector /></View>}
          {secondary.length > 0 && (
            <View style={styles.secondaryCol}>
              {secondary.map(f => <FragmentCard key={f.id} fragment={f} />)}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Scrubber ────────────────────────────────────────────────────────────────
function Scrubber({
  startTime,
  endTime,
  scrollRatio,
  onSeek,
  onPlayToggle,
  isPlaying,
}: {
  startTime: string;
  endTime: string;
  scrollRatio: number;
  onSeek: (ratio: number) => void;
  onPlayToggle: () => void;
  isPlaying: boolean;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  // Ref so PanResponder closure always sees fresh values without recreating.
  const trackWidthRef = useRef(1);
  const scrollRatioRef = useRef(scrollRatio);
  scrollRatioRef.current = scrollRatio;

  const startRatioRef = useRef(0);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startRatioRef.current = scrollRatioRef.current;
    },
    onPanResponderMove: (_, gs) => {
      const usable = trackWidthRef.current - HANDLE_W;
      const delta = usable > 0 ? gs.dx / usable : 0;
      const next = Math.min(1, Math.max(0, startRatioRef.current + delta));
      onSeek(next);
    },
  }), [onSeek]);

  // Allow tapping anywhere on the track to seek.
  const onTrackPress = (e: { nativeEvent: { locationX: number } }) => {
    const usable = trackWidthRef.current - HANDLE_W;
    if (usable <= 0) return;
    const ratio = Math.min(1, Math.max(0, (e.nativeEvent.locationX - HANDLE_W / 2) / usable));
    onSeek(ratio);
  };

  const fillPct = scrollRatio * 100;
  const handleLeft = scrollRatio * Math.max(0, trackWidth - HANDLE_W);

  return (
    <View style={styles.scrubber}>
      <Text style={styles.scrubberTitle}>Timeline</Text>
      <View style={styles.scrubberRow}>
        <TouchableOpacity style={styles.playButton} onPress={onPlayToggle} activeOpacity={0.7}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={TEXT} />
        </TouchableOpacity>

        <Text style={styles.scrubTime}>{startTime}</Text>

        <View
          style={styles.trackWrapper}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            setTrackWidth(w);
            trackWidthRef.current = w;
          }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onTrackPress}
        >
          <View style={styles.trackBg} />
          <View style={[styles.trackFill, { width: `${fillPct}%` }]} />
          {/* Draggable handle */}
          <View
            style={[styles.trackHandle, { left: handleLeft }]}
            {...panResponder.panHandlers}
          />
        </View>

        <Text style={styles.scrubTime}>{endTime}</Text>

        <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
          <Ionicons name="expand" size={20} color={MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
const PLAY_STEP = 0.005; // ratio per tick
const PLAY_INTERVAL_MS = 50;

export default function ReconstructScreen() {
  const [timeline, setTimeline] = useState<TimelineMoment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Scroll state
  const scrollRef = useRef<ScrollView>(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const scrollableRef = useRef(1); // contentHeight - viewportHeight
  const scrollRatioRef = useRef(0);

  // Play state
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([getGraph(), listFragments()])
      .then(([graph, frags]) => {
        setTotalCount(frags.length);
        setTimeline(buildTimeline(graph, frags));
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load timeline.'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-scroll when playing
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        const next = Math.min(1, scrollRatioRef.current + PLAY_STEP);
        seekTo(next);
        if (next >= 1) setIsPlaying(false);
      }, PLAY_INTERVAL_MS);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying]);

  function seekTo(ratio: number) {
    const y = ratio * scrollableRef.current;
    scrollRef.current?.scrollTo({ y, animated: false });
    scrollRatioRef.current = ratio;
    setScrollRatio(ratio);
  }

  const startTime = timeline.length > 0 ? timeline[0].time : '—';
  const endTime   = timeline.length > 0 ? timeline[timeline.length - 1].time : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
          scrollableRef.current = scrollable;
          const ratio = contentOffset.y / scrollable;
          scrollRatioRef.current = ratio;
          setScrollRatio(ratio);
        }}
        onContentSizeChange={(_, h) => {
          // viewport height may not be set yet; keep scrollable fresh
        }}
        onLayout={e => {
          // keep scrollableRef in sync when layout changes
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={16} color={TEXT} />
            <Text style={styles.pillText}>{totalCount} Memories</Text>
          </View>
          <Text style={styles.heading}>RECONSTRUCT</Text>
          <Text style={styles.subtext}>
            Visualize your memories as a connected story across places, people and moments.
          </Text>
          <View style={styles.statusPill}>
            <Ionicons name="sparkles" size={14} color={PURPLE} />
            <Text style={styles.statusText}>
              {loading ? 'Reconstructing Memory...' : `${timeline.length} moments`}
            </Text>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 40 }} />}
        {error && !loading && <Text style={styles.errorText}>{error}</Text>}
        {!loading && !error && timeline.length === 0 && (
          <Text style={styles.emptyText}>No memories to reconstruct yet — start capturing!</Text>
        )}

        {!loading && !error && timeline.length > 0 && (
          <View style={styles.timeline}>
            {timeline.map((moment, i) => (
              <MomentRow
                key={moment.id}
                moment={moment}
                isFirst={i === 0}
                isLast={i === timeline.length - 1}
              />
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <Scrubber
        startTime={startTime}
        endTime={endTime}
        scrollRatio={scrollRatio}
        onSeek={seekTo}
        isPlaying={isPlaying}
        onPlayToggle={() => {
          if (scrollRatio >= 1) seekTo(0);
          setIsPlaying(p => !p);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: BG },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 8 },

  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
    marginBottom: 20,
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
  pillText:  { color: TEXT,   fontSize: 14, fontWeight: '500' },
  heading:   { color: TEXT,   fontSize: 30, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  subtext:   { color: MUTED,  fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: { color: PURPLE, fontSize: 14, fontWeight: '500' },
  errorText:  { color: '#FF5252', fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  emptyText:  { color: MUTED,    fontSize: 14, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },

  timeline:   { paddingRight: 12 },
  momentRow:  { flexDirection: 'row', minHeight: 60 },

  timestampCol: { width: 64, paddingTop: 2, alignItems: 'flex-end', paddingRight: 8 },
  timeText:     { color: MUTED, fontSize: 11, fontWeight: '500' },

  timelineCol: { width: 20, alignItems: 'center' },
  lineSegment: { flex: 1, width: 2, backgroundColor: '#2A2A2A', minHeight: 16 },
  dot:         { width: 10, height: 10, borderRadius: 5, marginVertical: 4 },

  contentCol: { flex: 1, paddingLeft: 10, paddingBottom: 16, gap: 8 },

  cardsRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  primaryCol:   { flex: 1, gap: 8 },
  connectorCol: { width: 16, alignItems: 'center', paddingTop: 36 },
  secondaryCol: { flex: 1, gap: 8, marginTop: 24 },

  dashCol:     { gap: 3, alignItems: 'center' },
  dashSegment: { width: 1.5, height: 4, backgroundColor: PURPLE, borderRadius: 1, opacity: 0.7 },

  card:    { backgroundColor: CARD, borderRadius: 14, padding: 10, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#111', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  mainText:  { color: TEXT,  fontSize: 13, lineHeight: 18 },
  cardTime:  { color: MUTED, fontSize: 11, marginTop: 2 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  chip:     { backgroundColor: '#1E1535', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { color: PURPLE, fontSize: 10, fontWeight: '600' },

  scrubber: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  scrubberTitle: { color: PURPLE, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  scrubberRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center',
  },
  scrubTime: { color: MUTED, fontSize: 11, fontWeight: '500' },
  trackWrapper: { flex: 1, height: 20, justifyContent: 'center' },
  trackBg:   { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#333', borderRadius: 2 },
  trackFill: { position: 'absolute', left: 0, height: 3, backgroundColor: PURPLE, borderRadius: 2 },
  trackHandle: {
    position: 'absolute',
    top: 2,
    width: HANDLE_W,
    height: HANDLE_W,
    borderRadius: HANDLE_W / 2,
    backgroundColor: PURPLE,
  },
});
