import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, MetricChart, Provenance, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function CoachReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, error, refreshing, reload } = useHogWatchResource(() => hogWatchMobileRepository.getCoachReport(id), [id]);
  if (!report) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>{error ? <EmptyState title="Coach report unavailable" detail={error} onRetry={reload} /> : <LoadingState />}</ScrollView>;
  const { coach, trend } = report;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}>
    <Card tone="cardinal"><Eyebrow light>{coach.role.toUpperCase()}</Eyebrow><View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}><Text selectable style={{ color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '900', flex: 1 }}>{coach.name}</Text><Text selectable style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '900' }}>{coach.grade}</Text></View><Text selectable style={{ color: '#F8E6E9', fontSize: 14, lineHeight: 20 }}>{coach.note}</Text></Card>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="WEEKLY TREND" title={trend.label} /><MetricChart metricId={trend.metricId} label={trend.label} values={trend.values} weeks={trend.weeks} suffix={trend.suffix} tone="positive" /></View>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="SCORECARD" title="Where the grade comes from" /><Card>{coach.scorecard.map((item, index) => <View key={item.label} style={{ gap: 6, paddingBottom: index === coach.scorecard.length - 1 ? 0 : 13, borderBottomWidth: index === coach.scorecard.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{item.label}</Text><Text selectable style={{ color: colors.cardinal, fontSize: 14, fontWeight: '900' }}>{item.score} · {item.grade}</Text></View><View style={{ height: 7, borderRadius: radius.pill, backgroundColor: colors.soft, overflow: 'hidden' }}><View style={{ width: `${item.score}%`, height: '100%', borderRadius: radius.pill, backgroundColor: colors.cardinal }} /></View></View>)}</Card></View>
    <Card tone="dark"><Eyebrow light>COACHING IMPLICATION</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 18, lineHeight: 25, fontWeight: '700' }}>{report.implication}</Text></Card>
    <Provenance provenance={report.provenance} scope="staff scorecard" />
    <AskPanel entity="coach" id={coach.id} metricIds={['hog-index']} chatClient={hogWatchMobileChat} view={{ screen: 'coach scorecard' }} label={`Ask about ${coach.name}`} />
  </ScrollView>;
}
