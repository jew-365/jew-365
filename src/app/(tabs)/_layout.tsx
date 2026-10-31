import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabs } from '@/components/BottomTabs';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      initialRouteName="home"
      // Back returns to home and, on home, leaves the app; the default ('firstRoute') went to the hidden index tab,
      // whose redirect sent it straight back, so Android's back button never closed the app.
      backBehavior="initialRoute"
      detachInactiveScreens={false}
      tabBar={(props) => <BottomTabs {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        animation: 'fade',
        lazy: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="more" />
      <Tabs.Screen name="siddur" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
