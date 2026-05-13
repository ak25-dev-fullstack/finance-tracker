import { C } from '@/constants/theme';
import { OnboardingProvider, useOnboarding } from '@/context/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useCallback } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const ONBOARDING_STEPS = [
  {
    key: 'home_tab',
    route: '/(tabs)',
    title: 'Home tab',
    description: 'This tab shows your dashboard, balances, quick actions, and connected accounts.',
    tabBarIndex: 0,
  },
  {
    key: 'home_actions',
    route: '/(tabs)',
    title: 'Quick actions',
    description: 'Use Home quick actions to add transactions, import data, and ask the AI assistant.',
    defaultHighlight: { x: 16, y: 220, width: screenWidth - 32, height: 120 },
  },
  {
    key: 'home_connect',
    route: '/(tabs)',
    title: 'Connect your bank',
    description: 'Link a bank account so your transactions sync automatically.',
    defaultHighlight: { x: 16, y: 380, width: screenWidth - 32, height: 120 },
  },
  {
    key: 'save_tab',
    route: '/(tabs)/save',
    title: 'Save tab',
    description: 'Track savings goals and progress on the Save tab.',
    tabBarIndex: 1,
  },
  {
    key: 'save_add_goal',
    route: '/(tabs)/save',
    title: 'Add a savings goal',
    description: 'Create a new savings goal and start tracking progress from the Save tab.',
    defaultHighlight: { x: 16, y: 16, width: 84, height: 44 },
  },
  {
    key: 'save_adviser',
    route: '/(tabs)/save',
    title: 'Consult an adviser',
    description: 'Use the adviser card to get personalised savings advice.',
    defaultHighlight: { x: 16, y: 520, width: screenWidth - 32, height: 120 },
  },
  {
    key: 'invest_tab',
    route: '/(tabs)/invest',
    title: 'Invest tab',
    description: 'Review your portfolio and holdings on the Invest tab.',
    tabBarIndex: 2,
  },
  {
    key: 'invest_portfolio',
    route: '/(tabs)/invest',
    title: 'Portfolio overview',
    description: 'Check your portfolio value, performance, and chart in the Invest tab.',
    defaultHighlight: { x: 16, y: 160, width: screenWidth - 32, height: 240 },
  },
  {
    key: 'invest_upload',
    route: '/(tabs)/invest',
    title: 'Upload or add holdings',
    description: 'Switch to Upload to add holdings or import statements for your portfolio.',
    defaultHighlight: { x: 16, y: 560, width: screenWidth - 32, height: 100 },
  },
  {
    key: 'credit_tab',
    route: '/(tabs)/credit',
    title: 'Credit tab',
    description: 'View credit score, debts, mortgage and pension information.',
    tabBarIndex: 3,
  },
  {
    key: 'credit_score',
    route: '/(tabs)/credit',
    title: 'Credit score snapshot',
    description: 'See your credit score and what it means on the Credit tab.',
    defaultHighlight: { x: 16, y: 120, width: screenWidth - 32, height: 180 },
  },
  {
    key: 'credit_sections',
    route: '/(tabs)/credit',
    title: 'Browse credit sections',
    description: 'Switch between loans, mortgage and pension views to compare your credit details.',
    defaultHighlight: { x: 16, y: 320, width: screenWidth - 32, height: 84 },
  },
  {
    key: 'adviser_tab',
    route: '/(tabs)/adviser',
    title: 'Adviser tab',
    description: 'Find your advisory team, messages, and consultation tools in Adviser.',
    tabBarIndex: 4,
  },
  {
    key: 'adviser_team',
    route: '/(tabs)/adviser',
    title: 'Meet your adviser team',
    description: 'View your advisers and their availability in the Adviser tab.',
    defaultHighlight: { x: 16, y: 140, width: screenWidth - 32, height: 140 },
  },
  {
    key: 'adviser_message',
    route: '/(tabs)/adviser',
    title: 'Send a message',
    description: 'Ask your adviser a question or request a consultation.',
    defaultHighlight: { x: 16, y: 420, width: screenWidth - 32, height: 140 },
  },
];

function OnboardingTabButton({ index, onPress, children, style, ...props }: any) {
  const { activeStepTabBarIndex, showOnboarding, nextStep } = useOnboarding();
  const handlePress = useCallback(
    async (event: any) => {
      await onPress?.(event);
      if (showOnboarding && activeStepTabBarIndex === index) {
        nextStep();
      }
    },
    [activeStepTabBarIndex, nextStep, onPress, showOnboarding]
  );

  return (
    <Pressable {...props} style={style} onPress={handlePress}>
      {children}
    </Pressable>
  );
}

function TabNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brandLight,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarButton: (props) => <OnboardingTabButton {...props} index={0} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="save"
        options={{
          title: 'Save',
          tabBarButton: (props) => <OnboardingTabButton {...props} index={1} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="invest"
        options={{
          title: 'Invest',
          tabBarLabel: 'Invest',
          tabBarButton: (props) => <OnboardingTabButton {...props} index={2} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="credit"
        options={{
          title: 'Credit',
          tabBarButton: (props) => <OnboardingTabButton {...props} index={3} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="adviser"
        options={{
          title: 'Adviser',
          tabBarButton: (props) => <OnboardingTabButton {...props} index={4} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <OnboardingProvider steps={ONBOARDING_STEPS}>
      <View style={styles.container}>
        <TabNavigator />
      </View>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

