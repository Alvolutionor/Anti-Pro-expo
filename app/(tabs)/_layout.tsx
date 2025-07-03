import { Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Entypo from '@expo/vector-icons/Entypo';
import React from 'react';

import { Tabs } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color }) => <FontAwesome5 size={28} name="tasks" color={color} />,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="calendar" color={color} />,
        }}
      />
          {/* <Tabs.Screen
        name="goal"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color }) => <Entypo size={28} name="text-document" color={color} />,
        }}
      /> */}
      <Tabs.Screen
        name="statistic"
        options={{
          title: 'Statistic',
          tabBarIcon: ({ color }) => <FontAwesome5 size={28} name="chart-bar" color={color} />,
        }}
      />
    </Tabs>
  );
}
