// TODO: Replace mock timeline data with real fragment data once a /reconstruct
// or graph-traversal endpoint is wired into cognee.ts

import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Palette — same values as MemoryScreen ───────────────────────────────────
const BG     = '#000';
const CARD   = '#1C1C1E';
const TEXT   = '#fff';
const MUTED  = '#888';
const PURPLE = '#7C5CFC';
const GOLD   = '#F5A623';

// ─── Types ───────────────────────────────────────────────────────────────────
type FragmentType = 'voice' | 'photo' | 'location' | 'text' | 'person';

type TimelineFragment = {
  id: string;
  type: FragmentType;
  timestamp: string;
  column: 'primary' | 'secondary';
  connectsTo?: string;
  transcript?: string;
  title?: string;
  subtitle?: string;
  placeName?: string;
  cityCountry?: string;
  content?: string;
  personName?: string;
  personDescription?: string;
};

type TimelineMoment = {
  id: string;
  time: string;
  dotColor: 'gold' | 'purple';
  label?: string;
  fragments: TimelineFragment[];
};

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_TIMELINE: TimelineMoment[] = [
  {
    id: 'm1',
    time: '8:15 PM',
    dotColor: 'gold',
    label: 'Started the night',
    fragments: [
      {
        id: 'f1',
        type: 'voice',
        timestamp: '8:15 PM',
        column: 'primary',
        connectsTo: 'f2',
        transcript: '"Getting ready to head out!"',
      },
      {
        id: 'f2',
        type: 'photo',
        timestamp: '8:33 PM',
        column: 'secondary',
        title: 'Mirage Bar Receipt',
        subtitle: 'Photo (Receipt)',
      },
    ],
  },
  {
    id: 'm2',
    time: '9:15 PM',
    dotColor: 'purple',
    fragments: [
      {
        id: 'f3',
        type: 'location',
        timestamp: '9:15 PM',
        column: 'primary',
        connectsTo: 'f4',
        placeName: 'Mirage, Koramangala',
        cityCountry: 'Bengaluru, India',
      },
      {
        id: 'f4',
        type: 'person',
        timestamp: '9:20 PM',
        column: 'secondary',
        connectsTo: 'f5',
        personName: 'Met Doug',
        personDescription: 'Cool guy, loves Rust and indie music.',
      },
      {
        id: 'f5',
        type: 'text',
        timestamp: '9:25 PM',
        column: 'secondary',
        content: '"Doug works at Cognee."',
      },
    ],
  },
  {
    id: 'm3',
    time: '11:02 PM',
    dotColor: 'purple',
    fragments: [
      {
        id: 'f6',
        type: 'voice',
        timestamp: '11:02 PM',
        column: 'primary',
        connectsTo: 'f7',
        transcript: '"Walked back home."',
      },
      {
        id: 'f7',
        type: 'location',
        timestamp: '11:30 PM',
        column: 'secondary',
        placeName: 'Home',
        cityCountry: 'Koramangala',
      },
    ],
  },
  {
    id: 'm4',
    time: '12:30 AM',
    dotColor: 'gold',
    label: 'End of the night',
    fragments: [],
  },
];

// ─── Type meta ───────────────────────────────────────────────────────────────
const TYPE_META: Record<
  FragmentType,
  { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }
> = {
  voice:    { label: 'Voice Note',      icon: 'mic',            color: PURPLE },
  photo:    { label: 'Photo (Receipt)', icon: 'camera',         color: GOLD   },
  location: { label: 'Location',        icon: 'location-sharp', color: PURPLE },
  text:     { label: 'Text Note',       icon: 'document-text',  color: GOLD   },
  person:   { label: 'Person',          icon: 'person',         color: PURPLE },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: FragmentType }) {
  const meta = TYPE_META[type];
  return (
    <View style={[styles.iconCircle, { borderColor: meta.color }]}>
      <Ionicons name={meta.icon} size={14} color={meta.color} />
    </View>
  );
}

// Manual dashed line — more reliable than borderStyle:'dashed' across platforms.
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

  const mainText =
    fragment.type === 'voice'    ? fragment.transcript       :
    fragment.type === 'photo'    ? fragment.title            :
    fragment.type === 'location' ? fragment.placeName        :
    fragment.type === 'text'     ? fragment.content          :
    fragment.personName;

  const subText =
    fragment.type === 'photo'    ? fragment.subtitle         :
    fragment.type === 'location' ? fragment.cityCountry      :
    fragment.type === 'person'   ? fragment.personDescription :
    undefined;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <TypeIcon type={fragment.type} />
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>
      {mainText ? (
        <Text style={styles.mainText} numberOfLines={3}>{mainText}</Text>
      ) : null}
      {subText ? (
        <Text style={styles.subText} numberOfLines={2}>{subText}</Text>
      ) : null}
      <Text style={styles.cardTime}>{fragment.timestamp}</Text>
    </View>
  );
}

function MomentRow({
  moment,
  isFirst,
  isLast,
}: {
  moment: TimelineMoment;
  isFirst: boolean;
  isLast: boolean;
}) {
  const dotColor = moment.dotColor === 'gold' ? GOLD : PURPLE;
  const primary   = moment.fragments.filter(f => f.column === 'primary');
  const secondary = moment.fragments.filter(f => f.column === 'secondary');
  const hasConnector = primary.length > 0 && secondary.length > 0;

  return (
    <View style={styles.momentRow}>
      {/* Timestamp */}
      <View style={styles.timestampCol}>
        <Text style={styles.timeText}>{moment.time}</Text>
      </View>

      {/* Vertical line + dot */}
      <View style={styles.timelineCol}>
        {!isFirst && <View style={styles.lineSegment} />}
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.lineSegment} />}
      </View>

      {/* Content */}
      <View style={styles.contentCol}>
        {moment.label && (
          <Text style={styles.momentLabel}>{moment.label}</Text>
        )}

        {moment.fragments.length > 0 && (
          <View style={styles.cardsRow}>
            {/* Primary cards */}
            <View style={styles.primaryCol}>
              {primary.map(f => (
                <FragmentCard key={f.id} fragment={f} />
              ))}
            </View>

            {/* Dashed connector between columns */}
            {hasConnector && (
              <View style={styles.connectorCol}>
                <DashedConnector />
              </View>
            )}

            {/* Secondary cards */}
            {secondary.length > 0 && (
              <View style={styles.secondaryCol}>
                {secondary.map(f => (
                  <FragmentCard key={f.id} fragment={f} />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Scrubber() {
  return (
    <View style={styles.scrubber}>
      <Text style={styles.scrubberTitle}>Timeline</Text>
      <View style={styles.scrubberRow}>
        {/* Play */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => console.log('TODO: play timeline')}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={16} color={TEXT} />
        </TouchableOpacity>

        <Text style={styles.scrubTime}>8:00 PM</Text>

        {/* Track */}
        <View style={styles.trackWrapper}>
          <View style={styles.trackBg} />
          <View style={styles.trackFill} />
          <View style={styles.trackHandle} />
        </View>

        <Text style={styles.scrubTime}>12:30 AM</Text>

        {/* Expand */}
        <TouchableOpacity
          onPress={() => console.log('TODO: fullscreen')}
          activeOpacity={0.7}
        >
          <Ionicons name="expand" size={20} color={MUTED} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
const MEMORY_COUNT = 8;

export default function ReconstructScreen() {
  const timeline: TimelineMoment[] = MOCK_TIMELINE;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={16} color={TEXT} />
            <Text style={styles.pillText}>{MEMORY_COUNT} Memories Today</Text>
          </View>
          <Text style={styles.heading}>RECONSTRUCT</Text>
          <Text style={styles.subtext}>
            Visualize your night as a connected story across places, people and moments.
          </Text>
          <View style={styles.statusPill}>
            <Ionicons name="sparkles" size={14} color={PURPLE} />
            <Text style={styles.statusText}>Reconstructing Memory...</Text>
          </View>
        </View>

        {/* Timeline */}
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

        <View style={{ height: 16 }} />
      </ScrollView>

      <Scrubber />
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
    paddingBottom: 8,
  },

  // Header
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
  statusText: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '500',
  },

  // Timeline
  timeline: {
    paddingRight: 12,
  },
  momentRow: {
    flexDirection: 'row',
    minHeight: 60,
  },

  // Timestamp column
  timestampCol: {
    width: 64,
    paddingTop: 2,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  timeText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '500',
  },

  // Dot + line column
  timelineCol: {
    width: 20,
    alignItems: 'center',
  },
  lineSegment: {
    flex: 1,
    width: 2,
    backgroundColor: '#2A2A2A',
    minHeight: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: 4,
  },

  // Content area to the right of the timeline
  contentCol: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
    gap: 8,
  },
  momentLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    paddingTop: 2,
  },

  // Cards layout
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryCol: {
    flex: 1,
    gap: 8,
  },
  connectorCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 36,
  },
  secondaryCol: {
    flex: 1,
    gap: 8,
    marginTop: 24, // stagger secondary cards slightly below primary
  },

  // Dashed connector
  dashCol: {
    gap: 3,
    alignItems: 'center',
  },
  dashSegment: {
    width: 1.5,
    height: 4,
    backgroundColor: PURPLE,
    borderRadius: 1,
    opacity: 0.7,
  },

  // Fragment card
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  mainText: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  subText: {
    color: MUTED,
    fontSize: 12,
  },
  cardTime: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  // Scrubber
  scrubber: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  scrubberTitle: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubTime: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '500',
  },
  trackWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    width: '62%',
    height: 3,
    backgroundColor: PURPLE,
    borderRadius: 2,
  },
  trackHandle: {
    position: 'absolute',
    left: '62%',
    marginLeft: -8,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PURPLE,
  },
});
