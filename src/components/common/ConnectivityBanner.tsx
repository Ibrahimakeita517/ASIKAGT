import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../models/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ConnectivityBanner = () => {
  const { isOnline, pendingCount, isSyncing } = useSync();
  const { colors } = useTheme();

  // ON NE MONTRE RIEN SI ON EST EN LIGNE
  // Le système synchronisera tout seul en arrière-plan sans déranger
  if (isOnline) return null;

  // On ne montre le bandeau QUE si on est réellement déconnecté
  const bannerColor = '#F59E0B'; // Orange
  const textColor = '#FFF';
  const statusText = `🟠 Mode Hors-ligne — ${pendingCount} opération(s) en attente`;
  const iconName: any = "cloud-offline";

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
