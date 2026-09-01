import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { adminService, ActivityLog } from '../../context/adminService';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeDate } from '../../context/formatters';
import { useNavigation } from '@react-navigation/native';

const ActivityLogScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const data = await adminService.getActivityLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const renderItem = ({ item }: { item: ActivityLog }) => (
    <View style={[styles.logItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="flash-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.logContent}>
        <Text style={[styles.logAction, { color: colors.text }]}>{item.action}</Text>
        <Text style={[styles.logTime, { color: colors.textMuted }]}>{formatRelativeDate(item.timestamp)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Journal d'activité</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLogs} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={60} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune activité enregistrée</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: 'bold' },
  list: { paddingHorizontal: 20 },
  logItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logContent: { flex: 1 },
  logAction: { fontSize: 15, fontWeight: '500' },
  logTime: { fontSize: 12, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15 }
});

export default ActivityLogScreen;
