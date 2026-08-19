import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { AskChatGPT, Card, DataProvenance, EmptyState, Eyebrow, LoadingState, SectionHeader, TrendBars } from '@/components/ui';
import { hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function CoachReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, error } = useHogWatchResource(() => hogWatchMobileRepository.getCoachReport(id), [id]);
  if (!report) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>{error ? <EmptyState title="Coach report unavailable" detail={error} /> : <LoadingState />}</ScrollView>;
  const { coach, trend } = report;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 24 }}>
    <Card tone="cardinal"><Eyebrow light>{coach.role.toUpperCase()}</Eyebrow><View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}><Text selectable style={{ color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '900', flex: 1 }}>{coach.name}</Text><Text selectable style={{ color: '#FFFFFF', fontSize: 38, fontWeight: '900' }}>{coach.grade}</Text></View><Text selectable style={{ color: '#F8E6E9', fontSize: 14, lineHeight: 20 }}>{coach.note}</Text></Card>
    <DataProvenance source={report.provenance.source} coverage={report.provenance.coverage} />
    <View style={{ gap: 12 }}><SectionHeader eyebrow="WEEKLY TREND" title={trend.label} /><Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}><Text selectable style={{ color: colors.ink, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{trend.values.at(-1)}</Text><Text selectable style={{ color: colors.positive, fontSize: 13, fontWeight: '800' }}>RISING THROUGH WEEK {trend.weeks.at(-1)}</Text></View><TrendBars values={trend.values} color={colors.positive} /></Card></View>
    <View style={{ gap: 12 }}><SectionHeader eyebrow="SCORECARD" title="Where the grade comes from" /><Card>{coach.scorecard.map((item, index) => <View key={item.label} style={{ gap: 6, paddingBottom: index === coach.scorecard.length - 1 ? 0 : 13, borderBottomWidth: index === coach.scorecard.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{item.label}</Text><Text selectable style={{ color: colors.cardinal, fontSize: 14, fontWeight: '900' }}>{item.score} · {item.grade}</Text></View><View style={{ height: 7, borderRadius: radius.pill, backgroundColor: colors.soft, overflow: 'hidden' }}><View style={{ width: `${item.score}%`, height: '100%', borderRadius: radius.pill, backgroundColor: colors.cardinal }} /></View></View>)}</Card></View>
    <Card tone="dark"><Eyebrow light>COACHING IMPLICATION</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 18, lineHeight: 25, fontWeight: '700' }}>{report.implication}</Text></Card>
    <AskChatGPT entity="coach" id={coach.id} metricIds={['hog-index']} />
  </ScrollView>;
}
