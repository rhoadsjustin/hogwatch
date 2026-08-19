import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Eyebrow, LoadingState, Pill } from '@/components/ui';
import { hogWatchMobileRepository } from '@/data/repository';
import { useHogWatchResource } from '@/data/use-hogwatch';
import { colors, radius } from '@/theme';

export default function PlayersScreen() {
  const { data: players } = useHogWatchResource(() => hogWatchMobileRepository.listPlayers(), []);
  if (!players) return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18 }}><LoadingState /></ScrollView>;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 38, gap: 22 }}>
    <View style={{ gap: 7 }}><Eyebrow>PLAYER STOCK</Eyebrow><Text selectable style={{ color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' }}>Watch the role, not just the box score.</Text><Text selectable style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>HogWatch follows the small changes that reveal whether a player is earning more of the game plan.</Text></View>
    <View style={{ gap: 11 }}>{players.map((player) => <Link href={`/players/${player.id}` as Href} key={player.id} asChild><Pressable style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}><Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}><View style={{ width: 52, height: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.small, borderCurve: 'continuous' }}><Text selectable style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>#{player.number}</Text></View><View style={{ flex: 1, gap: 3 }}><Text selectable style={{ color: colors.cardinal, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>{player.position} · {player.classYear}</Text><Text selectable style={{ color: colors.ink, fontSize: 19, fontWeight: '900' }}>{player.name}</Text><Text selectable style={{ color: colors.muted, fontSize: 13 }}>{player.height} · {player.weight} lbs</Text></View></View><Pill tone="good">OPEN REPORT →</Pill></Card></Pressable></Link>)}</View>
  </ScrollView>;
}
