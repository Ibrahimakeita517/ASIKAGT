import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../context/transactionService';
import { stockService } from '../../context/stockService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency } from '../../context/formatters';
import { Card } from '../../components/common/Card';
import { LineChart } from 'react-native-chart-kit';

const StatsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const screenWidth = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<{labels: string[], datasets: any[]}>({
    labels: ["Jan", "Feb", "Mar"],
    datasets: [{ data: [0, 0, 0] }]
  });

  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    balance: 0,
    lowStockCount: 0,
    topCategory: 'N/A'
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const summary = await transactionService.getFinancialSummary(user.id);
      const products = await stockService.getProducts(user.id);
      const transactions = await transactionService.getTransactions(user.id);
      const daily = await transactionService.getDailyStats(user.id, 6);

      // Calcul du stock bas (ex: moins de 5 articles)
      const lowStock = products.filter(p => p.quantity <= 5).length;

      // Calcul de la catégorie la plus fréquente
      const categories = transactions.filter(t => t.type === 'sale').map(t => t.category);
      const topCat = categories.length > 0
        ? categories.sort((a,b) =>
            categories.filter(v => v===a).length - categories.filter(v => v===b).length
          ).pop()
        : 'Aucune';

      setStats({
        totalSales: summary.totalSales,
        totalExpenses: summary.totalExpenses,
        balance: summary.balance,
        lowStockCount: lowStock,
        topCategory: topCat || 'Général'
      });

      if (daily.labels.length > 0) {
        setChartData({
          labels: daily.labels,
          datasets: [
            {
              data: daily.sales,
              color: (opacity = 1) => colors.primary,
              strokeWidth: 3
            }
          ]
        });
      }
    } catch (error) {
      console.error("Erreur stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user, colors]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const StatItem = ({ title, value, icon, color, subValue, isCurrency = true }: any) => (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.statTitle, { color: colors.textMuted }]} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>
        {isCurrency ? formatCurrency(value) : value}
      </Text>
      {subValue && <Text style={[styles.subValue, { color: color }]}>{subValue}</Text>}
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analyses du Commerce</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Performances de votre boutique</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.grid}>
          <StatItem
            title="Ventes Totales"
            value={stats.totalSales}
            icon="trending-up"
            color={colors.secondary}
          />
          <StatItem
            title="Dépenses"
            value={stats.totalExpenses}
            icon="trending-down"
            color={colors.danger}
          />
          <StatItem
            title="Bénéfice Net"
            value={stats.balance}
            icon="wallet"
            color={stats.balance >= 0 ? colors.primary : colors.danger}
            subValue={stats.balance >= 0 ? "Performance Positive" : "Attention aux pertes"}
          />
          <StatItem
            title="Top Catégorie"
            value={stats.topCategory}
            icon="ribbon"
            color="#8B5CF6"
            isCurrency={false}
          />
        </View>

        <Text style={[styles.chartTitle, { color: colors.text }]}>Évolution des ventes (7j)</Text>
        <Card style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={screenWidth - 60}
            height={180}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary,
              labelColor: (opacity = 1) => colors.textMuted,
              style: { borderRadius: 16 },
              propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
        </Card>

        <TouchableOpacity style={styles.fullWidthCard}>
          <Card style={[styles.alertCard, { borderColor: stats.lowStockCount > 0 ? colors.danger : colors.border }]}>
            <View style={styles.alertContent}>
              <Ionicons
                name={stats.lowStockCount > 0 ? "warning" : "checkmark-circle"}
                size={30}
                color={stats.lowStockCount > 0 ? colors.danger : colors.secondary}
              />
              <View style={styles.alertText}>
                <Text style={[styles.alertTitle, { color: colors.text }]}>État des Stocks</Text>
                <Text style={[styles.alertDesc, { color: colors.textMuted }]}>
                  {stats.lowStockCount > 0
                    ? `${stats.lowStockCount} produits sont presque épuisés.`
                    : "Tous vos stocks sont au-dessus du seuil d'alerte."}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={styles.adviceBox}>
          <Text style={[styles.adviceTitle, { color: colors.text }]}>💡 Conseil ASIKA AI</Text>
          <Text style={[styles.adviceText, { color: colors.textMuted }]}>
            {stats.totalExpenses > stats.totalSales
              ? "Vos dépenses dépassent vos revenus. ASIKA vous suggère de vérifier vos achats récents et de prioriser les articles à forte rotation."
              : `Excellent travail ! Votre catégorie "${stats.topCategory}" est la plus rentable. Pensez à augmenter votre stock sur ces articles.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  scrollContent: { padding: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', marginBottom: 15, padding: 12 },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  statTitle: { fontSize: 11, fontWeight: '600', flex: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  subValue: { fontSize: 9, marginTop: 4, fontWeight: 'bold' },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 10, marginLeft: 5 },
  chartCard: { padding: 10, alignItems: 'center', marginBottom: 15 },
  fullWidthCard: { width: '100%', marginTop: 5 },
  alertCard: { padding: 15, borderWidth: 1 },
  alertContent: { flexDirection: 'row', alignItems: 'center' },
  alertText: { flex: 1, marginLeft: 15 },
  alertTitle: { fontSize: 16, fontWeight: 'bold' },
  alertDesc: { fontSize: 13, marginTop: 2 },
  adviceBox: { marginTop: 20, padding: 20, borderRadius: 15, backgroundColor: 'rgba(59, 130, 246, 0.05)', borderLeftWidth: 4, borderLeftColor: '#3B82F6', marginBottom: 30 },
  adviceTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  adviceText: { fontSize: 14, lineHeight: 20 }
});

export default StatsScreen;
