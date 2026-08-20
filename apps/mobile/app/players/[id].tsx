import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, MetricChart, Pill, Provenance, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function PlayerReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, error, refreshing, reload } = useHogWatchResource(() => hogWatchMobileRepository.getPlayerReport(id), [id]);
  if (!report) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>{error ? <EmptyState title="Player report unavailable" detail={error} onRetry={reload} /> : <LoadingState />}</ScrollView>;
  const { player, insight } = report;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}>
    <Card tone="dark"><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}><View style={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardinal, borderRadius: radius.card, borderCurve: 'continuous' }}><Text selectable style={{ color: '#FFFFFF', fontSize: 25, fontWeight: '900' }}>#{player.number}</Text></View><View style={{ flex: 1, gap: 3 }}><Eyebrow light>{player.position} · {player.classYear}</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '900' }}>{player.name}</Text><Text selectable style={{ color: '#D7D2D0', fontSize: 13 }}>{player.height} · {player.weight} lbs · {player.hometown}</Text></View></View><Pill tone="good">STOCK {insight.stock.toUpperCase()} · {insight.stockNote.toUpperCase()}</Pill></Card>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="ROLE ON FILM" title="Why the stock is moving" /><Card><Text selectable style={{ color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '700' }}>{insight.role}</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{insight.story}</Text></Card></View>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="WEEKLY TREND" title={insight.trend.label} /><MetricChart metricId={insight.trend.metricId} label={insight.trend.label} values={insight.trend.values} weeks={insight.trend.weeks} suffix={insight.trend.suffix} tone="positive" /></View>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="PLAYER EVIDENCE" title="The useful numbers" /><Card>{Object.entries(player.stats).map(([label, value], index, entries) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: index === entries.length - 1 ? 0 : 12, borderBottomWidth: index === entries.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{label}</Text><Text selectable style={{ color: colors.muted, fontSize: 12 }}>{insight.details[label] ?? 'Current season'}</Text></View><Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text></View>)}</Card></View>
    <Provenance provenance={report.provenance} scope="player report" />
    <AskPanel entity="player" id={player.id} metricIds={insight.metricIds} chatClient={hogWatchMobileChat} view={{ screen: 'player report' }} label={`Ask about ${player.name}`} />
  </ScrollView>;
}
