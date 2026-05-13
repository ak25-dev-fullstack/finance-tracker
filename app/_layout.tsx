import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/auth';

function RootLayoutNav() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F172A' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
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
