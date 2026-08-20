import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, Provenance, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

function PercentileBar({ label, value, percentile, suffix }: { label: string; value: number; percentile: number; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800', width: 34 }}>{label}</Text>
      <View style={{ flex: 1, height: 13, borderRadius: 4, backgroundColor: colors.soft }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${percentile}%`, borderRadius: 4, backgroundColor: colors.cardinal }} />
        <View style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, backgroundColor: colors.line }} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700', width: 74, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{value}{suffix ?? ''} · {percentile}th</Text>
    </View>
  );
}

export default function CompareScreen() {
  const [selection, setSelection] = useState<{ a?: string; b?: string }>({});
  const { data, error, refreshing, reload } = useHogWatchResource(async () => {
    const games = await hogWatchMobileRepository.listGames();
    const comparable = games.filter((game) => Object.keys(game.metrics).length > 0);
    const gameAId = selection.a ?? comparable.at(0)?.id;
    const gameBId = selection.b ?? comparable.at(-1)?.id;
    const comparison = gameAId && gameBId && gameAId !== gameBId
      ? await hogWatchMobileRepository.compareGames(gameAId, gameBId)
      : undefined;
    return { comparable, comparison, gameAId, gameBId };
  }, [selection.a, selection.b]);

  if (!data) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>
        {error ? <EmptyState title="Comparison unavailable" detail={error} onRetry={reload} /> : <LoadingState />}
      </ScrollView>
    );
  }

  const { comparable, comparison, gameAId, gameBId } = data;

  const picker = (which: 'a' | 'b', selected?: string) => (
    <View style={{ gap: 8 }}>
      <Eyebrow>{which === 'a' ? 'BASELINE' : 'COMPARISON'}</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {comparable.map((game) => {
          const active = selected === game.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={`${which}-${game.id}`}
              onPress={() => setSelection((current) => ({ ...current, [which]: game.id }))}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: active ? colors.cardinal : colors.soft, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 8 })}
            >
              <Text style={{ color: active ? '#FFFFFF' : colors.ink, fontSize: 12, fontWeight: '800' }}>W{game.week} {game.opponentShort}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 22 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}
    >
      <View style={{ gap: 7 }}>
        <Eyebrow>GAME COMPARISON</Eyebrow>
        <Text style={{ color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>Two games, side by side.</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Any two games with measured metrics can be compared — a final score is not required.</Text>
      </View>

      {comparable.length < 2 ? (
        <EmptyState
          title="Not enough graded games"
          detail={`Comparison needs two games with measured metrics. HogWatch has ${comparable.length} so far. Every scheduled game still has its own matchup preview.`}
        />
      ) : (
        <>
          <Card>
            {picker('a', gameAId)}
            {picker('b', gameBId)}
          </Card>

          {comparison ? (
            <>
              <Provenance provenance={comparison.provenance} scope="comparison" />
              <SectionHeader eyebrow="SHARED METRICS" title={comparison.summary} />
              {comparison.metricComparisons.map((metric) => {
                const improved = metric.goodDirection === 'up' ? metric.delta > 0 : metric.delta < 0;
                const level = metric.delta === 0;
                return (
                  <Card key={metric.metricId}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800', flex: 1 }}>{metric.label}</Text>
                      <Text style={{ color: level ? colors.muted : improved ? colors.positive : colors.warning, fontSize: 12, fontWeight: '800' }}>
                        {metric.delta > 0 ? '+' : ''}{metric.delta} · {level ? 'level' : improved ? 'better' : 'worse'}
                      </Text>
                    </View>
                    <PercentileBar label={`W${comparison.gameA.week}`} value={metric.gameA} percentile={metric.gameAPercentile} />
                    <PercentileBar label={`W${comparison.gameB.week}`} value={metric.gameB} percentile={metric.gameBPercentile} />
                  </Card>
                );
              })}
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Bars are national percentile, so longer is always better football. The tick marks the FBS median.</Text>

              <AskPanel
                entity="game"
                id={comparison.gameB.id}
                metricIds={comparison.metricComparisons.map((metric) => metric.metricId)}
                chatClient={hogWatchMobileChat}
                view={{ screen: 'game comparison', weeks: [comparison.gameA.week, comparison.gameB.week] }}
                label={`Ask what changed from ${comparison.gameA.opponent} to ${comparison.gameB.opponent}`}
              />
            </>
          ) : (
            <EmptyState title="Pick two different games" detail="Choose a baseline and a comparison above to see every shared metric side by side." />
          )}
        </>
      )}
    </ScrollView>
  );
}
