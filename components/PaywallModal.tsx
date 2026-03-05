import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSubscription } from '@/context/SubscriptionContext';

const TERMS_URL = 'https://jt-mypersonal.github.io/Moneo/terms.html';
const PRIVACY_URL = 'https://jt-mypersonal.github.io/Moneo/privacy.html';

interface PaywallModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPurchaseSuccess: () => void;
}

export function PaywallModal({ visible, onDismiss, onPurchaseSuccess }: PaywallModalProps) {
  const { currentOffering, purchasePremium, restorePurchases } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const priceLabel = currentOffering?.availablePackages[0]?.product.priceString ?? '$4.99 / year';

  const handlePurchase = async () => {
    setPurchasing(true);
    const success = await purchasePremium();
    setPurchasing(false);
    if (success) onPurchaseSuccess();
  };

  const handleRestore = async () => {
    setRestoring(true);
    const success = await restorePurchases();
    setRestoring(false);
    if (success) onPurchaseSuccess();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.starIcon}>{'\u2B50'}</Text>
          <Text style={styles.title}>Unlock Moneo Pro</Text>
          <Text style={styles.subtitle}>Take your habits to the next level</Text>

          <View style={styles.featureList}>
            <Text style={styles.featureItem}>{'\u2713'}  Unlimited habits</Text>
            <Text style={styles.featureItem}>{'\u2713'}  Custom notification sounds</Text>
            <Text style={styles.featureItem}>{'\u2713'}  Support an indie developer</Text>
          </View>

          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={handlePurchase}
            disabled={purchasing || restoring}
            activeOpacity={0.85}
          >
            {purchasing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.purchaseButtonText}>{priceLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={purchasing || restoring}
            activeOpacity={0.7}
          >
            {restoring ? (
              <ActivityIndicator color="#6b7280" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <View style={styles.legalRow}>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              Terms of Service
            </Text>
            <Text style={styles.legalSeparator}>|</Text>
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL(PRIVACY_URL)}
            >
              Privacy Policy
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            disabled={purchasing || restoring}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    width: '85%',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 15,
    color: '#374151',
    paddingVertical: 6,
    paddingLeft: 4,
  },
  purchaseButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  restoreButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legalLink: {
    color: '#9ca3af',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#d1d5db',
    fontSize: 12,
    marginHorizontal: 8,
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
});
