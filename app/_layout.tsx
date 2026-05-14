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
    const seg0 = segments[0] as string;
    const inTabs = seg0 === '(tabs)';
    const inLogin = seg0 === 'login';
    const inRegister = seg0 === 'register';
    const inProfile = seg0 === 'profile';
    const inSearch = seg0 === 'search';
    const inTransactionDetail = seg0 === 'transaction-detail';
    const inConnectBank = seg0 === 'connect-bank';
    const inAddTransaction = seg0 === 'add-transaction';
    const inImport = seg0 === 'import';
    const inInsights = seg0 === 'insights';

    if (!user && !inLogin && !inRegister) {
      router.replace('/login');
    } else if (user && (inLogin || inRegister || (!inTabs && !inProfile && !inSearch && !inTransactionDetail && !inConnectBank && !inAddTransaction && !inImport && !inInsights))) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

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
        <Stack.Screen name="profile" options={{ headerShown: false }} />
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
            headerTintColor: '#00b4d8',
            headerShadowVisible: false,
            headerTitleStyle: { color: '#F8FAFC' },
          }}
        />
        <Stack.Screen
          name="import"
          options={{
            headerShown: true,
            headerTitle: 'Import',
            headerStyle: { backgroundColor: '#1E293B' },
            headerTintColor: '#00b4d8',
            headerShadowVisible: false,
            headerTitleStyle: { color: '#F8FAFC' },
          }}
        />
        <Stack.Screen
          name="insights"
          options={{
            headerShown: true,
            headerTitle: 'Spending Insights',
            headerStyle: { backgroundColor: '#1E293B' },
            headerTintColor: '#00b4d8',
            headerShadowVisible: false,
            headerTitleStyle: { color: '#F8FAFC' },
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="transaction-detail"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Transaction',
            headerStyle: { backgroundColor: '#1E293B' },
            headerTintColor: '#00b4d8',
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
