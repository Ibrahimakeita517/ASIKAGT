import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Share, Platform } from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { adminService, GlobalStats } from '../../context/adminService';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../context/formatters';
import { useNavigation } from '@react-navigation/native';

const AdminReports = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    const data = await adminService.getGlobalStats();
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async () => {
    if (!stats) return;

    const csvContent = `Rapport ASIKA - ${new Date().toLocaleDateString()}\n\n` +
      `Ventes Globales: ${stats.totalSales} FCFA\n` +
      `Dettes Totales: ${stats.totalDebt} FCFA\n` +
      `Marchands Actifs: ${stats.totalMerchants}\n` +
      `Abonnements Actifs: ${stats.activeSubscriptions}\n\n` +
      `TOP MARCHANDS:\n` +
      stats.topMerchants.map(m => `${m.name}: ${m.amount} FCFA`).join('\n');

    try {
      await Share.share({
        message: csvContent,
        title: 'Rapport Admin ASIKA'
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (!stats) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Statistiques & Rapports</Text>
      </View>

      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Ionicons name="cart" size={24} color={colors.secondary} />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ventes Globales</Text>
          <Text style={[styles.statValue, { color: colors.secondary }]}>{formatCurrency(stats.totalSales)}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Ionicons name="wallet" size={24} color={colors.danger} />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Dettes Marchands</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(stats.totalDebt)}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Marchands</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalMerchants}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Ionicons name="flash" size={24} color="#F59E0B" />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expirent bientôt</Text>
          <Text style={[styles.statValue, { color: "#F59E0B" }]}>{stats.expiringSoon}</Text>
        </Card>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Top 5 Marchands</Text>
      <Card style={styles.listCard}>
        {stats.topMerchants.map((merchant, index) => (
          <View key={index} style={[styles.listItem, index < 4 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <View style={styles.rankCircle}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={[styles.merchantName, { color: colors.text }]}>{merchant.name}</Text>
            <Text style={[styles.merchantAmount, { color: colors.secondary }]}>{formatCurrency(merchant.amount)}</Text>
          </View>
        ))}
        {stats.topMerchants.length === 0 && (
          <Text style={{ textAlign: 'center', padding: 20, color: colors.textMuted }}>Aucune donnée de vente</Text>
        )}
      </Card>

      <TouchableOpacity
        style={[styles.exportBtn, { backgroundColor: colors.primary }]}
        onPress={handleExport}
      >
        <Ionicons name="share-outline" size={20} color="#FFF" />
        <Text style={styles.exportBtnText}>Exporter les données (CSV/Texte)</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 22, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15 },
  statCard: { width: '45%', margin: '2.5%', padding: 15, alignItems: 'center' },
  statLabel: { fontSize: 12, marginTop: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  listCard: { marginHorizontal: 20, padding: 0 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  rankCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: 'bold' },
  merchantName: { flex: 1, fontSize: 15 },
  merchantAmount: { fontWeight: 'bold' },
  exportBtn: {
    margin: 20,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2
  },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10 }
});

export default AdminReports;
