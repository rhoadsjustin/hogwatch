import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { AskPanel, Card, EmptyState, Eyebrow, LoadingState, MetricChart, MetricDelta, Pill, Provenance, ProvenanceTag, SectionHeader } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function DashboardScreen() {
  const { data, error, refreshing, reload } = useHogWatchResource(async () => {
    const [dashboard, coaches, games, successRate, pressure] = await Promise.all([
      hogWatchMobileRepository.getSeasonDashboard(),
      hogWatchMobileRepository.listCoaches(),
      hogWatchMobileRepository.listGames(),
      hogWatchMobileRepository.getMetricTrend({ metricId: 'success-rate' }),
      hogWatchMobileRepository.getMetricTrend({ metricId: 'pressure-generated' }),
    ]);
    return { dashboard, coaches, games, successRate, pressure };
  }, []);

  if (!data) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}>
        {error ? <EmptyState title="HogWatch is unavailable" detail={error} onRetry={reload} /> : <LoadingState />}
      </ScrollView>
    );
  }

  const { dashboard, coaches, games, successRate, pressure } = data;
  const latest = dashboard.latestGame;
  const nextGame = games.find((game) => !game.result);
  // A live schedule still sits beside fixture-backed grading. Say so per section.
  const analyticsAreFixtures = dashboard.provenance.source === 'provider';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 26 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.cardinal} />}
    >
      <View style={{ backgroundColor: colors.cardinal, borderRadius: radius.card, borderCurve: 'continuous', padding: 20, gap: 22, overflow: 'hidden' }}>
        <View style={{ gap: 7 }}>
          <Eyebrow light>{dashboard.season} SEASON · {dashboard.completedGames ? `THROUGH WEEK ${dashboard.completedGames}` : 'BEFORE WEEK 1'}</Eyebrow>
          <Text style={{ color: '#FFFFFF', fontSize: 35, lineHeight: 38, letterSpacing: -1.2, fontWeight: '900' }}>Is Arkansas{`\n`}getting better?</Text>
          <Text style={{ color: '#F8E6E9', fontSize: 14, lineHeight: 20 }}>Grades for the habits that travel—not just the final score.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>RECORD</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 44, lineHeight: 47, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{dashboard.record.replace('-', '–')}</Text>
            <Text style={{ color: '#F8E6E9', fontSize: 12 }}>Projected: {dashboard.projectedRecord.replace('-', '–')}</Text>
          </View>
          {dashboard.hogIndex && <View style={{ borderLeftWidth: 1, borderLeftColor: '#FFFFFF4D', paddingLeft: 18, minWidth: 92, gap: 2 }}>
            <Text style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>HOG INDEX</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 36, lineHeight: 39, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{dashboard.hogIndex.total}</Text>
            <Text style={{ color: '#F8E6E9', fontSize: 12 }}>Week {latest?.week}</Text>
          </View>}
        </View>
      </View>

      <Provenance provenance={dashboard.provenance} />

      <Card tone="dark">
        <Eyebrow light>THE FILM SAYS</Eyebrow>
        <Text style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '800' }}>{dashboard.story}</Text>
        {latest
          ? <Link href={`/games/${latest.id}` as Href} style={{ alignSelf: 'flex-start' }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Read the {latest.opponent} grade →</Text></Link>
          : nextGame && <Link href={`/games/${nextGame.id}` as Href} style={{ alignSelf: 'flex-start' }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>See the {nextGame.opponent} preview →</Text></Link>}
      </Card>

      {nextGame?.prediction && (
        <Link href={`/games/${nextGame.id}` as Href} asChild>
          <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Eyebrow>NEXT UP · WEEK {nextGame.week}</Eyebrow>
                  <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '900' }}>{nextGame.location === 'away' ? '@ ' : 'vs. '}{nextGame.opponent}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '800' }}>WIN CHANCE</Text>
                  <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{nextGame.prediction.winProbability}%</Text>
                </View>
              </View>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{nextGame.prediction.summary}</Text>
              <Text style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Full matchup preview →</Text>
            </Card>
          </Pressable>
        </Link>
      )}

      {dashboard.signals.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionHeader eyebrow="BIGGEST SIGNALS" title="What changed" />
          <View style={{ gap: 10 }}>
            {dashboard.signals.map((signal) => {
              const delta = signal.delta ?? 0;
              const improving = signal.goodDirection === 'up' ? delta >= 0 : delta <= 0;
              return (
                <Card key={signal.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Pill tone={improving ? 'good' : 'watch'}>{improving ? 'MOVING RIGHT' : 'WATCH THIS'}</Pill>
                      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{signal.label}</Text>
                      <MetricDelta delta={signal.delta} goodDirection={signal.goodDirection} />
                    </View>
                    <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{signal.value}{signal.unit}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      )}

      {(successRate || pressure) && (
        <View style={{ gap: 12 }}>
          <SectionHeader eyebrow="WEEK-TO-WEEK" title="What is moving" action={<Link href="/trends"><Text style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Explore all →</Text></Link>} />
          {analyticsAreFixtures && <ProvenanceTag basis="fixture" />}
          {successRate && <MetricChart metricId={successRate.metricId} values={successRate.values} weeks={successRate.weeks} suffix={successRate.suffix} tone="positive" />}
          {pressure && <MetricChart metricId={pressure.metricId} values={pressure.values} weeks={pressure.weeks} suffix={pressure.suffix} />}
        </View>
      )}

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="STAFF SCORECARD" title="Who owns the next step" action={<Link href="/coaches"><Text style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>All staff →</Text></Link>} />
        {analyticsAreFixtures && <ProvenanceTag basis="fixture" />}
        <View style={{ gap: 9 }}>{coaches.map((coach) => <Link href={`/coaches/${coach.id}` as Href} key={coach.id} asChild><Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.small, borderCurve: 'continuous', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, backgroundColor: '#F7E0E5' }}><Text style={{ color: colors.cardinal, fontSize: 17, fontWeight: '900' }}>{coach.grade}</Text></View><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{coach.role.toUpperCase()}</Text><Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{coach.name}</Text></View><Text style={{ color: colors.cardinal, fontSize: 18 }}>›</Text></Pressable></Link>)}</View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="SCHEDULE" title="Results and what is next" action={<Link href="/compare"><Text style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Compare →</Text></Link>} />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' }}>{games.map((game, index) => <Link href={`/games/${game.id}` as Href} key={game.id} asChild><Pressable style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, borderBottomWidth: index === games.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '900', width: 26 }}>W{game.week}</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{game.location === 'away' ? '@ ' : 'vs. '}{game.opponent}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{game.date}</Text>
            {game.prediction && <Text style={{ color: colors.cardinal, fontSize: 11, fontWeight: '800' }}>HOGWATCH: {game.prediction.winProbability}% · {game.prediction.projectedArkansasScore}–{game.prediction.projectedOpponentScore}</Text>}
          </View>
          {game.result
            ? <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: game.result === 'W' ? colors.positive : colors.negative, fontSize: 14, fontWeight: '900' }}>{game.result} {game.arkansasScore}–{game.opponentScore}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>HOG {game.hogIndex ?? '—'}</Text>
              </View>
            : <Text style={{ color: game.prediction ? colors.cardinal : colors.muted, fontSize: 13, fontWeight: '800' }}>{game.prediction ? 'Preview →' : 'No preview'}</Text>}
        </Pressable></Link>)}</View>
      </View>

      <AskPanel
        entity="season"
        id="arkansas-2026"
        metricIds={['hog-index', 'pressure-allowed', 'four-man-pressure', 'explosives-allowed']}
        chatClient={hogWatchMobileChat}
        view={{ screen: 'season dashboard' }}
        label="Ask whether Arkansas is actually improving"
      />
    </ScrollView>
  );
}
