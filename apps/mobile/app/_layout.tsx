import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerStyle: { backgroundColor: colors.paper },
        headerLargeStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.cardinal,
        headerTitleStyle: { color: colors.ink, fontWeight: '800' },
        contentStyle: { backgroundColor: colors.paper },
      }}>
        <Stack.Screen name="index" options={{ title: 'HogWatch' }} />
        <Stack.Screen name="games/[id]" options={{ title: 'Game grade', headerLargeTitle: false }} />
        <Stack.Screen name="coaches/index" options={{ title: 'Staff scorecard' }} />
        <Stack.Screen name="coaches/[id]" options={{ title: 'Coach scorecard', headerLargeTitle: false }} />
        <Stack.Screen name="players/index" options={{ title: 'Player stock' }} />
        <Stack.Screen name="players/[id]" options={{ title: 'Player report', headerLargeTitle: false }} />
        <Stack.Screen name="trends" options={{ title: 'Trends' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare games' }} />
      </Stack>
    </>
  );
}
