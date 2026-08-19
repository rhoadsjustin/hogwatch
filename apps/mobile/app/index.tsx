import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, DataProvenance, Eyebrow, LoadingState, MetricDelta, Pill, SectionHeader, TrendBars } from '@/components/ui';
import { hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function DashboardScreen() {
  const { data } = useHogWatchResource(async () => {
    const [dashboard, coaches, games, successRate, pressure] = await Promise.all([
      hogWatchMobileRepository.getSeasonDashboard(),
      hogWatchMobileRepository.listCoaches(),
      hogWatchMobileRepository.listGames(),
      hogWatchMobileRepository.getMetricTrend({ metricId: 'success-rate' }),
      hogWatchMobileRepository.getMetricTrend({ metricId: 'pressure-generated' }),
    ]);
    return { dashboard, coaches, games, successRate, pressure };
  }, []);
  if (!data) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}><LoadingState /></ScrollView>;
  const { dashboard, coaches, games, successRate, pressure } = data;
  const latest = dashboard.latestGame;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 36, gap: 26 }}>
      <View style={{ backgroundColor: colors.cardinal, borderRadius: radius.card, borderCurve: 'continuous', padding: 20, gap: 22, overflow: 'hidden' }}>
        <View style={{ gap: 7 }}>
          <Eyebrow light>{dashboard.season} SEASON · THROUGH WEEK {dashboard.completedGames}</Eyebrow>
          <Text selectable style={{ color: '#FFFFFF', fontSize: 35, lineHeight: 38, letterSpacing: -1.2, fontWeight: '900' }}>Is Arkansas{`\n`}getting better?</Text>
          <Text selectable style={{ color: '#F8E6E9', fontSize: 14, lineHeight: 20 }}>Grades for the habits that travel—not just the final score.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>RECORD</Text>
            <Text selectable style={{ color: '#FFFFFF', fontSize: 44, lineHeight: 47, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{dashboard.record.replace('-', '–')}</Text>
            <Text selectable style={{ color: '#F8E6E9', fontSize: 12 }}>Projected: {dashboard.projectedRecord}</Text>
          </View>
          {dashboard.hogIndex && <View style={{ borderLeftWidth: 1, borderLeftColor: '#FFFFFF4D', paddingLeft: 18, minWidth: 92, gap: 2 }}>
            <Text selectable style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>HOG INDEX</Text>
            <Text selectable style={{ color: '#FFFFFF', fontSize: 36, lineHeight: 39, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{dashboard.hogIndex.total}</Text>
            <Text selectable style={{ color: '#F8E6E9', fontSize: 12 }}>Week {latest?.week}</Text>
          </View>}
        </View>
      </View>

      <DataProvenance source={dashboard.provenance.source} coverage={dashboard.provenance.coverage} />

      <Card tone="dark">
        <Eyebrow light>THE FILM SAYS</Eyebrow>
        <Text selectable style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 28, fontWeight: '800' }}>{dashboard.story}</Text>
        <Text selectable style={{ color: '#D7D2D0', fontSize: 14, lineHeight: 20 }}>Pressure allowed fell five points at Utah while the defense generated its best four-man heat of the young season.</Text>
        {latest && <Link href={`/games/${latest.id}` as Href} style={{ alignSelf: 'flex-start' }}><Text selectable style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Read the game grade →</Text></Link>}
      </Card>

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="BIGGEST SIGNALS" title="What changed" />
        <View style={{ gap: 10 }}>
          {dashboard.signals.map((signal) => {
            const improving = signal.goodDirection === 'up' ? (signal.delta ?? 0) >= 0 : (signal.delta ?? 0) <= 0;
            return <Card key={signal.id}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><View style={{ flex: 1, gap: 5 }}><Pill tone={improving ? 'good' : 'watch'}>{improving ? 'MOVING RIGHT' : 'WATCH THIS'}</Pill><Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{signal.id === 'pressure-generated' ? 'Four-man pressure' : signal.label}</Text><MetricDelta delta={signal.delta} goodDirection={signal.goodDirection} /></View><Text selectable style={{ color: colors.ink, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{signal.value}{signal.unit}</Text></View></Card>;
          })}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="WEEK-TO-WEEK" title="What is moving" action={<Link href="/trends"><Text selectable style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Explore all →</Text></Link>} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {successRate && <Card><Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: '800' }}>{successRate.label}</Text><Text selectable style={{ color: colors.ink, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{successRate.values.at(-1)}{successRate.suffix}</Text><TrendBars values={successRate.values} color={colors.positive} /></Card>}
          {pressure && <Card><Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: '800' }}>Defensive pressure</Text><Text selectable style={{ color: colors.ink, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{pressure.values.at(-1)}{pressure.suffix}</Text><TrendBars values={pressure.values} /></Card>}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="STAFF SCORECARD" title="Who owns the next step" action={<Link href="/coaches"><Text selectable style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>All staff →</Text></Link>} />
        <View style={{ gap: 9 }}>{coaches.map((coach) => <Link href={`/coaches/${coach.id}` as Href} key={coach.id} asChild><Pressable style={{ backgroundColor: colors.surface, borderRadius: radius.small, borderCurve: 'continuous', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, backgroundColor: '#F7E0E5' }}><Text selectable style={{ color: colors.cardinal, fontSize: 17, fontWeight: '900' }}>{coach.grade}</Text></View><View style={{ flex: 1, gap: 2 }}><Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: '800' }}>{coach.role.toUpperCase()}</Text><Text selectable style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>{coach.name}</Text></View><Text style={{ color: colors.cardinal, fontSize: 18 }}>›</Text></Pressable></Link>)}</View>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader eyebrow="SCHEDULE" title="Results and what is next" />
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, borderCurve: 'continuous', overflow: 'hidden' }}>{games.map((game, index) => <Link href={`/games/${game.id}` as Href} key={game.id} asChild><Pressable style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, borderBottomWidth: index === games.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: '900', width: 26 }}>W{game.week}</Text><View style={{ flex: 1, gap: 2 }}><Text selectable style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>{game.location === 'away' ? '@ ' : 'vs. '}{game.opponent}</Text><Text selectable style={{ color: colors.muted, fontSize: 12 }}>{game.date}</Text></View>{game.result ? <View style={{ alignItems: 'flex-end' }}><Text selectable style={{ color: game.result === 'W' ? colors.positive : colors.negative, fontSize: 14, fontWeight: '900' }}>{game.result} {game.arkansasScore}–{game.opponentScore}</Text><Text selectable style={{ color: colors.muted, fontSize: 11 }}>HOG {game.hogIndex ?? '—'}</Text></View> : <Text selectable style={{ color: colors.cardinal, fontSize: 13, fontWeight: '800' }}>Preview →</Text>}</Pressable></Link>)}</View>
      </View>
    </ScrollView>
  );
}
