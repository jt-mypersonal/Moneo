import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { RC_API_KEY, ENTITLEMENT_ID } from '@/constants/revenueCat';

type PurchasesModule = typeof import('react-native-purchases');
type Offerings = Awaited<ReturnType<PurchasesModule['default']['getOfferings']>>;
type PurchasesOffering = Offerings['current'];

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  isLoading: true,
  currentOffering: null,
  purchasePremium: async () => false,
  restorePurchases: async () => false,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [Purchases, setPurchases] = useState<PurchasesModule['default'] | null>(null);

  useEffect(() => {
    (async () => {
      // Skip on web or when no API key is configured
      if (Platform.OS === 'web' || !RC_API_KEY) {
        setIsLoading(false);
        return;
      }

      try {
        const mod = await import('react-native-purchases');
        const RC = mod.default;
        setPurchases(() => RC);

        RC.configure({ apiKey: RC_API_KEY });

        // Check current entitlements
        const customerInfo = await RC.getCustomerInfo();
        const entitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        setIsPro(entitled);

        // Fetch offerings for paywall price display
        const offerings = await RC.getOfferings();
        setCurrentOffering(offerings.current ?? null);

        // Listen for subscription changes
        RC.addCustomerInfoUpdateListener((info) => {
          setIsPro(info.entitlements.active[ENTITLEMENT_ID] !== undefined);
        });
      } catch (e) {
        // RevenueCat init failed — run in free mode, no crash
        console.warn('RevenueCat init failed:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    if (!Purchases || !currentOffering) {
      Alert.alert('Unavailable', 'Purchases are not available right now. Please try again later.');
      return false;
    }

    const pkg = currentOffering.availablePackages[0];
    if (!pkg) {
      Alert.alert('Unavailable', 'No subscription package found. Please try again later.');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(entitled);
      return entitled;
    } catch (e: any) {
      if (e.userCancelled) return false;
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      return false;
    }
  }, [Purchases, currentOffering]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!Purchases) {
      Alert.alert('Unavailable', 'Restore is not available right now. Please try again later.');
      return false;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitled = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(entitled);
      if (!entitled) {
        Alert.alert('No Subscription Found', 'We could not find an active subscription for this account.');
      }
      return entitled;
    } catch (e) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
      return false;
    }
  }, [Purchases]);

  return (
    <SubscriptionContext.Provider value={{ isPro, isLoading, currentOffering, purchasePremium, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
