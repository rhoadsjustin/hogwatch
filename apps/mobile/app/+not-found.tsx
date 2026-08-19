import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { colors } from '@/theme';

export default function NotFoundScreen() {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 12 }}><View><Text selectable style={{ color: colors.ink, fontSize: 24, fontWeight: '900' }}>That report is not on the board.</Text><Text selectable style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>Return to the season dashboard and choose another report.</Text></View><Link href="/"><Text selectable style={{ color: colors.cardinal, fontSize: 15, fontWeight: '800' }}>Back to HogWatch →</Text></Link></ScrollView>;
}
