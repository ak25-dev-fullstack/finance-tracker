import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/auth';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    const inLogin = (segments[0] as string) === 'login';
    const inRegister = (segments[0] as string) === 'register';

    if (!user && !inLogin && !inRegister) {
      router.replace('/login');
    } else if (user && (inLogin || inRegister || !inTabs)) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="connect-bank"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-transaction"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Add Transaction',
            headerStyle: { backgroundColor: '#1E293B' },
            headerTintColor: '#6bd8cb',
            headerShadowVisible: false,
            headerTitleStyle: { color: '#F8FAFC' },
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
