import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, MatchupPanel, PredictionCard, Pill, Provenance, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { METRIC_METADATA, METRIC_IDS, metricPercentile } from '@hogwatch/core';
import { colors, radius } from '@/theme';

export default function GameReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, refreshing, reload } = useHogWatchResource(async () => {
    const [report, preview] = await Promise.all([
      hogWatchMobileRepository.getGameAnalysis(id),
      hogWatchMobileRepository.getMatchupPreview(id),
    ]);
    return report ? { report, preview } : undefined;
  }, [id]);

  if (!data) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>
        {error ? <EmptyState title="Game report unavailable" detail={error} onRetry={reload} /> : <LoadingState />}
      </ScrollView>
    );
  }

  const { report, preview } = data;
  const { game, hogIndex } = report;
  const isFinal = Boolean(game.result);
  const metrics = METRIC_IDS.flatMap((metricId) => game.metrics[metricId] === undefined ? [] : [{ metricId, value: game.metrics[metricId] as number }]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}
    >
      <View style={{ alignItems: 'center', gap: 7, paddingTop: 10 }}>
        <Eyebrow>WEEK {game.week} · {game.location === 'away' ? 'ON THE ROAD' : 'AT HOME'}</Eyebrow>
        <Text style={{ color: colors.ink, fontSize: 31, letterSpacing: -1, fontWeight: '900', textAlign: 'center' }}>Arkansas {game.location === 'away' ? 'at' : 'vs.'} {game.opponent}</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>{game.date}</Text>
      </View>

      <Card tone="dark">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 3 }}>
            <Eyebrow light>{isFinal ? 'FINAL' : 'UP NEXT'}</Eyebrow>
            <Text style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
              {isFinal ? `${game.result} ${game.arkansasScore}–${game.opponentScore}` : game.date}
            </Text>
          </View>
          {hogIndex && <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF19', borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 13, paddingVertical: 9 }}>
            <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>HOG INDEX</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{hogIndex.total}</Text>
          </View>}
        </View>
        <Text style={{ color: '#E0DBD9', fontSize: 15, lineHeight: 22 }}>{report.thesis}</Text>
      </Card>

      <Provenance provenance={report.provenance} />

      {game.prediction && <PredictionCard prediction={game.prediction} opponentShort={game.opponentShort} />}

      {preview
        ? <MatchupPanel preview={preview} />
        : <EmptyState
            title={`No matchup preview for ${game.opponent}`}
            detail="A preview needs the opponent's unit ratings. Until they are loaded this screen stays blank rather than quietly guessing."
          />}

      {hogIndex && <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="HOG INDEX" title="The grade, broken down" />
        <Card>{([
          ['Offense', hogIndex.offense, '30%'], ['Defense', hogIndex.defense, '30%'], ['Coaching', hogIndex.coaching, '25%'], ['Development', hogIndex.development, '15%'],
        ] as const).map(([label, score, weight]) => <View key={label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>{label}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>{score} · {weight}</Text>
          </View>
          <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.soft, overflow: 'hidden' }}>
            <View style={{ width: `${score}%`, height: '100%', backgroundColor: label === 'Defense' ? colors.positive : colors.cardinal, borderRadius: radius.pill }} />
          </View>
        </View>)}</Card>
      </View>}

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="GAME STORY" title={isFinal ? 'What the film says' : 'What to watch'} />
        <Card><Text style={{ color: colors.ink, fontSize: 17, lineHeight: 25, fontWeight: '700' }}>{report.story}</Text></Card>
      </View>

      {metrics.length > 0 && <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="CORE METRICS" title="The evidence, in national context" />
        <Card>{metrics.map(({ metricId, value }, index) => {
          const metadata = METRIC_METADATA[metricId];
          const percentile = metricPercentile(metricId, value);
          return (
            <View key={metricId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: index === metrics.length - 1 ? 0 : 12, borderBottomWidth: index === metrics.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{metadata.label}</Text>
                <Pill tone={percentile >= 60 ? 'good' : percentile <= 40 ? 'watch' : 'neutral'}>{percentile}TH PERCENTILE</Pill>
              </View>
              <Text style={{ color: colors.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}{metadata.suffix}</Text>
            </View>
          );
        })}</Card>
      </View>}

      <AskPanel
        entity={preview && !isFinal ? 'matchup' : 'game'}
        id={game.id}
        metricIds={metrics.map(({ metricId }) => metricId)}
        chatClient={hogWatchMobileChat}
        view={{ screen: isFinal ? 'game grade' : 'matchup preview', weeks: [game.week] }}
        label={`Ask about Arkansas vs. ${game.opponent}`}
      />
    </ScrollView>
  );
}
