import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { colors, radius } from '@/theme';
import type { HogWatchChatClient } from '@/data/worker-client';
import type { GamePrediction } from '@hogwatch/core';

export function Card({ children, tone = 'light' }: PropsWithChildren<{ tone?: 'light' | 'dark' | 'cardinal' }>) {
  const backgroundColor = tone === 'dark' ? colors.charcoal : tone === 'cardinal' ? colors.cardinal : colors.surface;
  return (
    <View style={{ backgroundColor, borderCurve: 'continuous', borderRadius: radius.card, padding: 18, gap: 10, boxShadow: tone === 'light' ? '0 5px 20px rgba(22, 19, 18, 0.06)' : undefined }}>
      {children}
    </View>
  );
}

export function Eyebrow({ children, light = false }: PropsWithChildren<{ light?: boolean }>) {
  return <Text selectable style={{ color: light ? '#F6D9DE' : colors.cardinal, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }}>{children}</Text>;
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ gap: 4, flex: 1 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text selectable style={{ color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Pill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'good' | 'watch' | 'cardinal' }>) {
  const palette = {
    neutral: { backgroundColor: colors.soft, color: colors.muted },
    good: { backgroundColor: '#DCF2E8', color: colors.positive },
    watch: { backgroundColor: '#FBE9D5', color: colors.warning },
    cardinal: { backgroundColor: '#F7E0E5', color: colors.cardinalDark },
  }[tone];
  return <View style={{ alignSelf: 'flex-start', borderRadius: radius.pill, borderCurve: 'continuous', paddingHorizontal: 9, paddingVertical: 5, backgroundColor: palette.backgroundColor }}><Text selectable style={{ color: palette.color, fontSize: 11, fontWeight: '800' }}>{children}</Text></View>;
}

export function PredictionCard({ prediction }: { prediction: GamePrediction }) {
  const lean = prediction.winProbability >= 50 ? 'ARKANSAS LEAN' : 'UPSET PATH';
  return (
    <Card tone="dark">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow light>HOGWATCH PREDICTION</Eyebrow>
          <Text selectable style={{ color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '900' }}>{lean}</Text>
          <Text selectable style={{ color: '#D7D2D0', fontSize: 13, lineHeight: 19 }}>Early model · form, camp, comparison, location</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}><Text selectable style={{ color: '#F6D9DE', fontSize: 10, fontWeight: '800' }}>WIN CHANCE</Text><Text selectable style={{ color: '#FFFFFF', fontSize: 37, lineHeight: 40, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.winProbability}%</Text></View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FFFFFF24', borderBottomWidth: 1, borderBottomColor: '#FFFFFF24' }}>
        <Text selectable style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.projectedArkansasScore}</Text><Text selectable style={{ color: '#D7D2D0', fontSize: 14, fontWeight: '800' }}>ARK</Text><Text selectable style={{ color: '#937D83', fontSize: 18 }}>—</Text><Text selectable style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{prediction.projectedOpponentScore}</Text><Text selectable style={{ color: '#D7D2D0', fontSize: 14, fontWeight: '800' }}>OPP</Text>
      </View>
      <Text selectable style={{ color: '#E0DBD9', fontSize: 14, lineHeight: 20 }}>{prediction.summary}</Text>
      <View style={{ gap: 8 }}>{prediction.factors.map((factor) => <View key={factor.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text selectable style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{factor.label}</Text><Text selectable style={{ color: factor.tone === 'edge' ? '#A8D5A5' : factor.tone === 'watch' ? '#E6BD68' : '#D7D2D0', fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1 }}>{factor.detail}</Text></View>)}</View>
    </Card>
  );
}

export function TrendBars({ values, color = colors.cardinal }: { values: readonly number[]; color?: string }) {
  const floor = Math.min(...values);
  const ceiling = Math.max(...values);
  const span = ceiling - floor || 1;
  return (
    <View accessibilityLabel="Trend chart" style={{ height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 7 }}>
      {values.map((value, index) => {
        const height = 20 + ((value - floor) / span) * 48;
        return <View key={`${value}-${index}`} style={{ flex: 1, height, borderRadius: 6, borderCurve: 'continuous', backgroundColor: index === values.length - 1 ? color : `${color}52` }} />;
      })}
    </View>
  );
}

export function MetricDelta({ delta, goodDirection }: { delta?: number; goodDirection?: 'up' | 'down' }) {
  if (delta === undefined || !goodDirection) return null;
  const favorable = goodDirection === 'up' ? delta >= 0 : delta <= 0;
  const arrow = delta === 0 ? '—' : delta > 0 ? '↑' : '↓';
  return <Text selectable style={{ color: favorable ? colors.positive : colors.warning, fontSize: 13, fontWeight: '800' }}>{arrow} {Math.abs(delta).toFixed(0)} vs W1</Text>;
}

export function AskChatGPT({ entity, id, metricIds, chatClient }: { entity: 'season' | 'game' | 'coach' | 'player' | 'metric'; id: string; metricIds: readonly string[]; chatClient?: HogWatchChatClient }) {
  const [answer, setAnswer] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const onPress = async () => {
    if (chatClient) {
      setLoading(true);
      setError(undefined);
      try {
        const result = await chatClient.ask({ entity, id, metricIds });
        setAnswer(result.answer);
      } catch (requestError) {
        setAnswer(undefined);
        setError(requestError instanceof Error ? requestError.message : 'Live chat is temporarily unavailable.');
      } finally {
        setLoading(false);
      }
      return;
    }
    const context = JSON.stringify({ app: 'HogWatch', entity, id, metricIds });
    await Share.share({ message: `Use this HogWatch context to explain the football story: ${context}` });
  };
  return (
    <View style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ busy: loading }} onPress={onPress} disabled={loading} style={({ pressed }) => ({ opacity: pressed || loading ? 0.75 : 1, backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 15, paddingVertical: 13, alignItems: 'center' })}>
        <Text selectable style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{loading ? 'Reading the evidence…' : chatClient ? 'Ask HogWatch about this' : 'Ask ChatGPT about this'}</Text>
      </Pressable>
      {answer && <Card tone="dark"><Eyebrow light>HOGWATCH ANSWER</Eyebrow><Text selectable style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '700' }}>{answer}</Text></Card>}
      {error && <Card><Text selectable style={{ color: colors.warning, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>{error}</Text></Card>}
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Card><Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{detail}</Text></Card>;
}

export function LoadingState({ label = 'Reading the latest HogWatch report…' }: { label?: string }) {
  return <View style={{ paddingVertical: 40, alignItems: 'center' }}><Text selectable style={{ color: colors.muted, fontSize: 14 }}>{label}</Text></View>;
}
