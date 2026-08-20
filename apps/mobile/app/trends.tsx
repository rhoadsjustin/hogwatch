import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, MetricChart, Pill, PredictionRecordCard, Provenance, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { MINIMUM_TREND_POINTS, type MetricId } from '@hogwatch/core';
import { colors, radius } from '@/theme';

const options: { id: MetricId; label: string; short: string }[] = [
  { id: 'hog-index', label: 'HOG Index', short: 'HOG' },
  { id: 'success-rate', label: 'Offensive success', short: 'OFF' },
  { id: 'pressure-generated', label: 'Defensive pressure', short: 'PRESSURE' },
  { id: 'pressure-allowed', label: 'Pressure allowed', short: 'PROTECT' },
];

export default function TrendsScreen() {
  const [metricId, setMetricId] = useState<MetricId>('hog-index');
  const { data, error, refreshing, reload } = useHogWatchResource(async () => {
    const [trend, record] = await Promise.all([
      hogWatchMobileRepository.getMetricTrend({ metricId, adjustment: 'opponent-adjusted' }),
      hogWatchMobileRepository.getPredictionRecord(),
    ]);
    return { trend, record };
  }, [metricId]);

  const trend = data?.trend;
  const latest = trend?.values.at(-1);
  const first = trend?.values.at(0);
  const delta = latest !== undefined && first !== undefined ? latest - first : 0;
  // The badge has to describe what the series actually did, not what the
  // metric would prefer it to do.
  const movingRightWay = trend ? (trend.goodDirection === 'up' ? delta >= 0 : delta <= 0) : true;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 22 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}
    >
      <View style={{ gap: 7 }}>
        <Eyebrow>SEASON EXPLORER</Eyebrow>
        <Text style={{ color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>Find the change beneath the result.</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Every metric is drawn on its own fixed scale against the FBS average, so a small move cannot look like a breakout.</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: metricId === option.id }}
            key={option.id}
            onPress={() => setMetricId(option.id)}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: metricId === option.id ? colors.cardinal : colors.soft, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 9 })}
          >
            <Text style={{ color: metricId === option.id ? '#FFFFFF' : colors.ink, fontSize: 12, fontWeight: '800' }}>{option.short}</Text>
          </Pressable>
        ))}
      </View>

      {data?.record && <PredictionRecordCard record={data.record} />}
      {data?.record && <Provenance provenance={data.record.provenance} scope="trends" />}

      {!data
        ? (error ? <EmptyState title="Trends unavailable" detail={error} onRetry={reload} /> : <LoadingState label="Calculating the selected trend…" />)
        : !trend
          ? <EmptyState title="No graded games yet" detail="Trends start once the first game has verified metrics. Until then the matchup previews carry the forward-looking view." />
          : <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pill tone={movingRightWay ? 'good' : 'watch'}>{movingRightWay ? 'MOVING THE RIGHT WAY' : 'MOVING THE WRONG WAY'}</Pill>
                {trend.values.length < MINIMUM_TREND_POINTS && <Pill tone="neutral">{trend.values.length}-GAME SAMPLE</Pill>}
              </View>

              <MetricChart metricId={trend.metricId} label={trend.label} values={trend.values} weeks={trend.weeks} suffix={trend.suffix} />

              <View style={{ gap: 12 }}>
                <SectionHeader eyebrow="HOW TO READ IT" title="Context changes the story" />
                <Card>
                  <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '700' }}>A trend is only useful if you know the opponent it traveled against.</Text>
                  <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>HogWatch adjusts each metric against the opponent’s same-perspective league baseline, then plots it on a fixed domain around the FBS average. Below {MINIMUM_TREND_POINTS} games the points are shown in place rather than joined into a line.</Text>
                </Card>
              </View>

              <AskPanel
                entity="metric"
                id={trend.metricId}
                metricIds={[trend.metricId]}
                chatClient={hogWatchMobileChat}
                view={{ screen: 'trend explorer', metricId: trend.metricId, weeks: trend.weeks }}
                label="Ask whether this trend is real"
              />
            </>}
    </ScrollView>
  );
}
