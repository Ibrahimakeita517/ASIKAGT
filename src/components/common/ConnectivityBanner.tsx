import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../models/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ConnectivityBanner = () => {
  const { isOnline, pendingCount, isSyncing } = useSync();
  const { colors } = useTheme();

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  let bannerColor = '#10B981'; // Vert (Online & Sync)
  let textColor = '#FFF';
  let statusText = '🟢 En ligne — Synchronisé';
  let iconName: any = "cloud-done";

  if (!isOnline) {
    bannerColor = '#F59E0B'; // Orange (Offline)
    statusText = `🟠 Hors ligne — ${pendingCount} vente(s) enregistrée(s) localement`;
    iconName = "cloud-offline";
  } else if (isSyncing) {
    bannerColor = '#3B82F6'; // Bleu (Syncing)
    statusText = '🔄 Synchronisation en cours...';
    iconName = "sync";
  } else if (pendingCount > 0) {
    bannerColor = '#F59E0B';
    statusText = `🟠 En ligne — ${pendingCount} opération(s) en attente`;
    iconName = "cloud-upload";
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bannerColor }]}>
      <View style={styles.content}>
        <Ionicons name={iconName} size={16} color={textColor} />
        <Text style={[styles.text, { color: textColor }]}>
          {statusText}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  }
});
