import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { transactionService } from '../../context/transactionService';
import { notificationService } from '../../context/notificationService';
import { Transaction, FinancialSummary } from '../../models/types';
import { TotalCard } from '../../components/home/TotalCard';
import { AddTransactionModal } from '../../components/home/AddTransactionModal';
import { formatFullDate, formatCurrency, formatRelativeDate } from '../../context/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // États pour la modale d'ajout
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'sale' | 'expense'>('sale');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const [sum, trans, count] = await Promise.all([
        transactionService.getFinancialSummary(user.id),
        transactionService.getTransactions(user.id),
        notificationService.getUnreadCount(user.id)
      ]);
      setSummary(sum);
      setRecentTransactions(trans.slice(0, 5));
      setUnreadCount(count);

      // Calcul de l'expiration de l'abonnement
      if (user.subscriptionExpiry) {
        const expiryDate = new Date(user.subscriptionExpiry);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setExpiryDays(diffDays);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    }
  };

  // Recharge les données chaque fois que l'écran revient au premier plan
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAddModal = (type: 'sale' | 'expense') => {
    setTransactionType(type);
    setIsModalVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Bonjour, {user?.firstName} 👋</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>{formatFullDate(new Date().toISOString())}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifIcon, { borderColor: colors.border }]}
            onPress={() => (navigation as any).navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {expiryDays !== null && expiryDays <= 3 && expiryDays > 0 && (
          <View style={[styles.expiryBanner, { backgroundColor: colors.danger + '15', borderColor: colors.danger }]}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={[styles.expiryText, { color: colors.danger }]}>
              Votre abonnement expire dans {expiryDays} {expiryDays === 1 ? 'jour' : 'jours'}.
            </Text>
          </View>
        )}

        <TotalCard 
          balance={summary?.balance || 0}
          sales={summary?.totalSales || 0}
          expenses={summary?.totalExpenses || 0}
        />

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => openAddModal('sale')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.actionLabel}>Nouvelle Vente</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
            onPress={() => openAddModal('expense')}
          >
            <Ionicons name="remove-circle-outline" size={24} color="#FFF" />
            <Text style={styles.actionLabel}>Nouvelle Dépense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dernières transactions</Text>
        </View>

        {recentTransactions.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.transactionItem, { backgroundColor: colors.surface }]}
            onPress={() => setSelectedTransaction(t)}
          >
            <View style={[styles.iconBox, { backgroundColor: t.type === 'sale' ? colors.secondary + '20' : colors.danger + '20' }]}>
              <Ionicons 
                name={t.type === 'sale' ? "arrow-up" : "arrow-down"} 
                size={20} 
                color={t.type === 'sale' ? colors.secondary : colors.danger} 
              />
            </View>
            <View style={styles.transDetails}>
              <Text style={[styles.transDesc, { color: colors.text }]} numberOfLines={1}>{t.description}</Text>
              <Text style={[styles.transDate, { color: colors.textMuted }]}>{formatRelativeDate(t.date)}</Text>
            </View>
            <Text style={[styles.transAmount, { color: t.type === 'sale' ? colors.secondary : colors.danger }]}>
              {t.type === 'sale' ? '+' : '-'} {formatCurrency(t.amount)}
            </Text>
          </TouchableOpacity>
        ))}

        {recentTransactions.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune transaction récente</Text>
        )}
      </ScrollView>

      <AddTransactionModal 
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        type={transactionType}
        onSuccess={loadData}
      />

      {/* Détails de la Transaction */}
      <Modal visible={!!selectedTransaction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Détails de la Transaction</Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView>
                <Card style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Montant</Text>
                    <Text style={[styles.detailValue, { color: selectedTransaction.type === 'sale' ? colors.secondary : colors.danger, fontSize: 24 }]}>
                      {formatCurrency(selectedTransaction.amount)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Type / Catégorie</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.category}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Description</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.description}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedTransaction.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </Card>
                <Button title="Fermer" onPress={() => setSelectedTransaction(null)} style={{ marginTop: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold' },
  date: { fontSize: 14, marginTop: 4 },
  notifIcon: { padding: 8, borderRadius: 12, borderWidth: 1, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF'
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  actionSection: { flexDirection: 'row', paddingHorizontal: 20, justifyContent: 'space-between', marginTop: 20 },
  actionBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12 },
  actionLabel: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  transDetails: { flex: 1, marginLeft: 12 },
  transDesc: { fontSize: 15, fontWeight: '600' },
  transDate: { fontSize: 12, marginTop: 2 },
  transAmount: { fontSize: 15, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  expiryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  detailCard: { padding: 20 },
  detailRow: { marginBottom: 15 },
  detailLabel: { fontSize: 14, marginBottom: 5 },
  detailValue: { fontSize: 17, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 }
});

export default HomeScreen;