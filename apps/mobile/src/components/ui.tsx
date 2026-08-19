import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

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

export function DataProvenance({ coverage, source }: { coverage: string; source: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EEE8E2', borderRadius: radius.small, borderCurve: 'continuous', padding: 12 }}>
      <Text accessibilityLabel="Data provenance" style={{ color: colors.cardinal, fontSize: 16 }}>●</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: colors.ink, fontSize: 12, fontWeight: '800' }}>{source === 'mock' ? 'Fixture data' : 'Provider data'}</Text>
        <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{coverage}</Text>
      </View>
    </View>
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

export function AskChatGPT({ entity, id, metricIds }: { entity: string; id: string; metricIds: readonly string[] }) {
  const onPress = async () => {
    const context = JSON.stringify({ app: 'HogWatch', entity, id, metricIds });
    await Share.share({ message: `Use this HogWatch context to explain the football story: ${context}` });
  };
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous', paddingHorizontal: 15, paddingVertical: 13, alignItems: 'center' })}>
      <Text selectable style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Ask ChatGPT about this</Text>
    </Pressable>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Card><Text selectable style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>{title}</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{detail}</Text></Card>;
}

export function LoadingState({ label = 'Reading the latest HogWatch report…' }: { label?: string }) {
  return <View style={{ paddingVertical: 40, alignItems: 'center' }}><Text selectable style={{ color: colors.muted, fontSize: 14 }}>{label}</Text></View>;
}
