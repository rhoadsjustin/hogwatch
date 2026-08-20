import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { AskChatGPT, Card, EmptyState, Eyebrow, LoadingState, Pill, PredictionCard, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { METRIC_METADATA, METRIC_IDS } from '@hogwatch/core';
import { colors, radius } from '@/theme';

export default function GameReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, error } = useHogWatchResource(() => hogWatchMobileRepository.getGameAnalysis(id), [id]);
  if (!report) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>{error ? <EmptyState title="Game report unavailable" detail={error} /> : <LoadingState />}</ScrollView>;
  const { game, hogIndex } = report;
  const metrics = METRIC_IDS.flatMap((metricId) => game.metrics[metricId] === undefined ? [] : [{ metricId, value: game.metrics[metricId] as number }]);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 24 }}>
      <View style={{ alignItems: 'center', gap: 7, paddingTop: 10 }}>
        <Eyebrow>WEEK {game.week} · {game.location === 'away' ? 'ON THE ROAD' : 'AT HOME'}</Eyebrow>
        <Text selectable style={{ color: colors.ink, fontSize: 31, letterSpacing: -1, fontWeight: '900' }}>Arkansas vs. {game.opponent}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 14 }}>{game.date}</Text>
      </View>

      <Card tone="dark">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 3 }}><Eyebrow light>FINAL</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{game.result ? `${game.result} ${game.arkansasScore}–${game.opponentScore}` : 'UP NEXT'}</Text></View>
          {hogIndex && <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF19', borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 13, paddingVertical: 9 }}><Text selectable style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>HOG INDEX</Text><Text selectable style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{hogIndex.total}</Text></View>}
        </View>
        <Text selectable style={{ color: '#E0DBD9', fontSize: 15, lineHeight: 22 }}>{report.thesis}</Text>
      </Card>

      {!game.result && game.prediction && <PredictionCard prediction={game.prediction} />}

      {hogIndex && <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="HOG INDEX" title="The grade, broken down" />
        <Card>{([
          ['Offense', hogIndex.offense, '30%'], ['Defense', hogIndex.defense, '30%'], ['Coaching', hogIndex.coaching, '25%'], ['Development', hogIndex.development, '15%'],
        ] as const).map(([label, score, weight]) => <View key={label} style={{ gap: 6 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text selectable style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>{label}</Text><Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>{score} · {weight}</Text></View><View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.soft, overflow: 'hidden' }}><View style={{ width: `${score}%`, height: '100%', backgroundColor: label === 'Defense' ? colors.positive : colors.cardinal, borderRadius: radius.pill }} /></View></View>)}</Card>
      </View>}

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="GAME STORY" title="What the film says" />
        <Card><Text selectable style={{ color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '700' }}>{report.story}</Text></Card>
      </View>

      {metrics.length > 0 && <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="CORE METRICS" title="The evidence" />
        <Card>{metrics.map(({ metricId, value }, index) => { const metadata = METRIC_METADATA[metricId]; return <View key={metricId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: index === metrics.length - 1 ? 0 : 12, borderBottomWidth: index === metrics.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{metadata.label}</Text><Pill tone={metadata.goodDirection === 'up' ? 'good' : 'watch'}>{metadata.goodDirection === 'up' ? 'HIGHER IS BETTER' : 'LOWER IS BETTER'}</Pill></View><Text selectable style={{ color: colors.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}{metadata.suffix}</Text></View>; })}</Card>
      </View>}

      <AskChatGPT entity="game" id={game.id} metricIds={metrics.map(({ metricId }) => metricId)} chatClient={hogWatchMobileChat} />
    </ScrollView>
  );
}
