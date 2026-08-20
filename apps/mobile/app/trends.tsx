import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AskChatGPT, Card, Eyebrow, LoadingState, Pill, SectionHeader, TrendBars } from '@/components/ui';
import { hogWatchMobileChat, hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import type { MetricId } from '@hogwatch/core';
import { colors, radius } from '@/theme';

const options: { id: MetricId; label: string; short: string }[] = [
  { id: 'hog-index', label: 'HOG Index', short: 'HOG' },
  { id: 'success-rate', label: 'Offensive success', short: 'OFF' },
  { id: 'pressure-generated', label: 'Defensive pressure', short: 'PRESSURE' },
  { id: 'pressure-allowed', label: 'Pressure allowed', short: 'PROTECT' },
];

export default function TrendsScreen() {
  const [metricId, setMetricId] = useState<MetricId>('hog-index');
  const { data: trend } = useHogWatchResource(() => hogWatchMobileRepository.getMetricTrend({ metricId, adjustment: 'opponent-adjusted' }), [metricId]);
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 22 }}>
    <View style={{ gap: 7 }}><Eyebrow>SEASON EXPLORER</Eyebrow><Text selectable style={{ color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>Find the change beneath the result.</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Opponent-aware trends help separate a better process from a softer opponent.</Text></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map((option) => <Pressable accessibilityRole="button" key={option.id} onPress={() => setMetricId(option.id)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: metricId === option.id ? colors.cardinal : colors.soft, borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 12, paddingVertical: 9 })}><Text selectable style={{ color: metricId === option.id ? '#FFFFFF' : colors.ink, fontSize: 12, fontWeight: '800' }}>{option.short}</Text></Pressable>)}</View>
    {!trend ? <LoadingState label="Calculating the selected trend…" /> : <><Card tone="dark"><Eyebrow light>OPPONENT-AWARE TREND</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '900' }}>{trend.label}</Text><View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Text selectable style={{ color: '#FFFFFF', fontSize: 46, lineHeight: 51, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{trend.values.at(-1)}{trend.suffix}</Text><Pill tone="good">{trend.goodDirection === 'up' ? 'TRENDING UP' : 'LOWER IS BETTER'}</Pill></View><TrendBars values={trend.values} color="#FFFFFF" /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{trend.weeks.map((week) => <Text selectable key={week} style={{ color: '#D7D2D0', fontSize: 11, fontWeight: '800' }}>W{week}</Text>)}</View></Card><View style={{ gap: 12 }}><SectionHeader eyebrow="HOW TO READ IT" title="Context changes the story" /><Card><Text selectable style={{ color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '700' }}>A trend is only useful if you know the opponent it traveled against.</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>HogWatch adjusts each metric against the opponent’s same-perspective league baseline. The direction stays visible, while the competition gets its due.</Text></Card></View><AskChatGPT entity="metric" id={trend.metricId} metricIds={[trend.metricId]} chatClient={hogWatchMobileChat} /></>}
  </ScrollView>;
}
