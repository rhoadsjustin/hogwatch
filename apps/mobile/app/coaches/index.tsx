import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card, EmptyState, Eyebrow, LoadingState, SectionHeader } from '@/components/ui';
import { hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function CoachesScreen() {
  const { data: coaches, error, refreshing, reload } = useHogWatchResource(() => hogWatchMobileRepository.listCoaches(), []);
  if (!coaches) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>{error ? <EmptyState title="Staff scorecard unavailable" detail={error} onRetry={reload} /> : <LoadingState />}</ScrollView>;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 22 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}>
    <View style={{ gap: 7 }}><Eyebrow>STAFF SCORECARD</Eyebrow><Text selectable style={{ color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>Who owns the next step?</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Grades turn weekly process into clear accountability.</Text></View>
    <View style={{ gap: 11 }}>{coaches.map((coach) => <Link href={`/coaches/${coach.id}` as Href} key={coach.id} asChild><Pressable style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}><Card><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}><View style={{ width: 52, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7E0E5', borderRadius: radius.small, borderCurve: 'continuous' }}><Text selectable style={{ color: colors.cardinal, fontSize: 21, fontWeight: '900' }}>{coach.grade}</Text></View><View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: colors.cardinal, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>{coach.role.toUpperCase()}</Text><Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: '900' }}>{coach.name}</Text><Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{coach.note}</Text></View></View><Text selectable style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Open scorecard →</Text></Card></Pressable></Link>)}</View>
    <View style={{ gap: 10 }}><SectionHeader eyebrow="HOW TO READ IT" title="Evidence, not vibes" /><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Each report traces coaching implications back to metrics that can travel from one opponent to the next.</Text></View>
  </ScrollView>;
}
