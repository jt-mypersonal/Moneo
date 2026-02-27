import { Stack } from 'expo-router';
import { SubscriptionProvider } from '@/context/SubscriptionContext';

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SubscriptionProvider>
  );
}
