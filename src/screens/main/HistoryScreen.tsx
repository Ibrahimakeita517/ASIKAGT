import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { transactionService } from '../../context/transactionService';
import { receiptService } from '../../services/receiptService';
import { Transaction } from '../../models/types';
import { formatCurrency, formatRelativeDate } from '../../context/formatters';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useFocusEffect } from '@react-navigation/native';

const HistoryScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'all' | 'sale' | 'expense' | 'debt'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // États pour le filtrage temporel
  const [filterMode, setFilterMode] = useState<'all' | 'day' | 'month' | 'year'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [customerWhatsApp, setCustomerWhatsApp] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const data = await transactionService.getTransactions(user.id);

    let filtered = data;

    // 1. Filtrage par type
    if (activeTab === 'debt') {
      filtered = filtered.filter(t => t.type === 'debt' && t.status !== 'paid');
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.type === activeTab);
    }

    // 2. Filtrage par date
    const d = selectedDate;
    if (filterMode === 'day') {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getDate() === d.getDate() &&
               tDate.getMonth() === d.getMonth() &&
               tDate.getFullYear() === d.getFullYear();
      });
    } else if (filterMode === 'month') {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === d.getMonth() &&
               tDate.getFullYear() === d.getFullYear();
      });
    } else if (filterMode === 'year') {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getFullYear() === d.getFullYear();
      });
    }

    setTransactions(filtered);
  }, [user, activeTab, filterMode, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filteredTransactions.reduce((sum, t) =>
    (t.type === 'sale' || t.type === 'debt') ? sum + t.amount : sum - t.amount, 0
  );

  const handlePrint = async () => {
    if (!selectedTransaction) return;
    try {
      await receiptService.print(selectedTransaction, user);
    } catch (error) {
      console.error("Erreur Impression:", error);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!selectedTransaction || !customerWhatsApp) {
      const msg = "Veuillez entrer le numéro de téléphone.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Erreur", msg);
      return;
    }
    try {
      await receiptService.shareToWhatsApp(selectedTransaction, user, customerWhatsApp);
      setShowWhatsAppModal(false);
    } catch (error) {
      console.error("Erreur WhatsApp:", error);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedTransaction || !paymentAmount || isNaN(Number(paymentAmount))) return;

    setLoading(true);
    try {
      const amountToPay = Number(paymentAmount);
      const updated = await transactionService.updateDebt(selectedTransaction.id, amountToPay, user!.id);

      if (updated) {
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
        if (activeTab === 'debt' && updated.status === 'paid') {
          setTransactions(prev => prev.filter(t => t.id !== updated.id));
        }
      }
      setSelectedTransaction(null);
      setPaymentAmount('');
    } catch (e) {
      console.error("Erreur paiement dette:", e);
      const msg = "Impossible d'enregistrer le versement.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Erreur", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isSale = item.type === 'sale';
    const isDebt = item.type === 'debt';

    let iconName: any = "arrow-up";
    let iconColor = colors.secondary;

    if (item.type === 'expense') {
      iconName = "arrow-down";
      iconColor = colors.danger;
    } else if (isDebt) {
      iconName = "hand-coin";
      iconColor = colors.primary;
    }

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => setSelectedTransaction(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          {isDebt ? (
            <MaterialCommunityIcons name="hand-coin" size={20} color={iconColor} />
          ) : (
            <Ionicons name={iconName} size={20} color={iconColor} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.description, { color: colors.text }]}>
            {isDebt ? `Dette: ${item.customerName || 'Client'}` : item.description}
          </Text>
          <Text style={[styles.category, { color: colors.textMuted }]}>
            {item.category}
          </Text>
        </View>
        <View style={styles.rightSide}>
          <Text style={[styles.amount, { color: iconColor }]}>
            {item.type === 'expense' ? '-' : '+'} {formatCurrency(item.amount)}
          </Text>
          {isDebt && item.remainingAmount > 0 && (
            <Text style={[styles.debtRemaining, { color: colors.danger }]}>
              Reste: {formatCurrency(item.remainingAmount)}
            </Text>
          )}
          <Text style={[styles.date, { color: colors.textMuted }]}>{formatRelativeDate(item.date)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    const confirmDelete = () => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          const result = window.confirm("Voulez-vous vraiment supprimer cette transaction ? Cette action restaurera également le stock si applicable.");
          resolve(result);
        } else {
          Alert.alert(
            "Supprimer l'opération",
            "Voulez-vous vraiment supprimer cette transaction ? Cette action restaurera également le stock si applicable.",
            [
              { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
              { text: "Supprimer", style: "destructive", onPress: () => resolve(true) }
            ]
          );
        }
      });
    };

    const shouldDelete = await confirmDelete();
    if (!shouldDelete) return;

    try {
      setLoading(true);
      await transactionService.deleteTransaction(selectedTransaction.id);

      // Mise à jour locale de la liste
      setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
      setSelectedTransaction(null);
    } catch (e) {
      console.error("Erreur suppression transaction:", e);
      const msg = "Impossible de supprimer la transaction.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Erreur", msg);
    } finally {
      setLoading(false);
    }
  };

  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Historique</Text>
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: filterMode !== 'all' ? colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="calendar" size={18} color={filterMode !== 'all' ? "#FFF" : colors.primary} />
            <Text style={[styles.filterBtnText, { color: filterMode !== 'all' ? "#FFF" : colors.text }]}>
              {filterMode === 'all' ? 'Tout' : filterMode === 'day' ? 'Jour' : filterMode === 'month' ? 'Mois' : 'An'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.summaryLabel}>Bilan de la période</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.periodBadge}>
            <Text style={styles.summaryPeriod}>
              {filterMode === 'all' ? 'Global' :
               filterMode === 'day' ? 'Aujourd\'hui' :
               filterMode === 'month' ? `${months[selectedDate.getMonth()]}` :
               `${selectedDate.getFullYear()}`}
            </Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Rechercher une transaction..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('all')}
          style={[styles.tab, activeTab === 'all' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'all' ? colors.primary : colors.textMuted }]}>Tout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('sale')}
          style={[styles.tab, activeTab === 'sale' && { borderBottomColor: colors.secondary, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'sale' ? colors.secondary : colors.textMuted }]}>Ventes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('expense')}
          style={[styles.tab, activeTab === 'expense' && { borderBottomColor: colors.danger, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'expense' ? colors.danger : colors.textMuted }]}>Dépenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('debt')}
          style={[styles.tab, activeTab === 'debt' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'debt' ? colors.primary : colors.textMuted }]}>Dettes</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>Aucune transaction trouvée</Text>}
      />

      {/* Modal de Sélection de Période */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filtrer par période</Text>

            <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('all'); setShowFilterModal(false); }}>
              <Ionicons name="infinite" size={20} color={colors.primary} />
              <Text style={[styles.filterOptionText, { color: colors.text }]}>Tout afficher</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('day'); setShowFilterModal(false); }}>
              <Ionicons name="today" size={20} color={colors.primary} />
              <Text style={[styles.filterOptionText, { color: colors.text }]}>Aujourd'hui</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('month'); setShowFilterModal(false); }}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.filterOptionText, { color: colors.text }]}>Ce mois-ci</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.filterOption} onPress={() => { setFilterMode('year'); setShowFilterModal(false); }}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={[styles.filterOptionText, { color: colors.text }]}>Cette année</Text>
            </TouchableOpacity>

            <Button title="Annuler" onPress={() => setShowFilterModal(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>

      {/* Détails de la Transaction */}
      <Modal visible={!!selectedTransaction} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Détails de l'opération</Text>
              <TouchableOpacity onPress={() => {
                setSelectedTransaction(null);
                setPaymentAmount(''); // Vider le champ quand on ferme
              }}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView>
                <Card style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Montant</Text>
                    <Text style={[styles.detailValue, { color: (selectedTransaction.type === 'sale' || selectedTransaction.type === 'debt') ? colors.secondary : colors.danger, fontSize: 24 }]}>
                      {formatCurrency(selectedTransaction.amount)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Catégorie</Text>
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
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>



                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                      onPress={handlePrint}
                    >
                      <Ionicons name="print" size={22} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>Imprimer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#25D366' + '15' }]}
                      onPress={() => {
                        setCustomerWhatsApp(selectedTransaction.customerPhone || '');
                        setShowWhatsAppModal(true);
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                      <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>

                  {selectedTransaction.type === 'debt' && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Client</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedTransaction.customerName}</Text>
                        <Text style={[styles.detailSub, { color: colors.textMuted }]}>{selectedTransaction.customerPhone}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Total à payer</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(selectedTransaction.totalAmount || 0)}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Reste à payer</Text>
                        <Text style={[styles.detailValue, { color: colors.danger, fontSize: 20 }]}>{formatCurrency(selectedTransaction.remainingAmount || 0)}</Text>
                      </View>

                      {selectedTransaction.remainingAmount > 0 && (
                        <View style={styles.paymentSection}>
                          <TextInput
                            style={[styles.paymentInput, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Montant du versement"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                          />
                          <Button
                            title="Ajouter Versement"
                            onPress={handleAddPayment}
                            loading={loading}
                          />
                        </View>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={[styles.deleteBtn, { marginTop: 20 }]}
                    onPress={handleDeleteTransaction}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    <Text style={[styles.deleteBtnText, { color: colors.danger, marginLeft: 8 }]}>Supprimer cette opération</Text>
                  </TouchableOpacity>
                </Card>
                <Button title="Fermer" onPress={() => setSelectedTransaction(null)} style={{ marginTop: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* Modal WhatsApp */}
      <Modal visible={showWhatsAppModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.whatsappModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Envoyer le reçu</Text>
            <Text style={[styles.detailLabel, { color: colors.textMuted, marginBottom: 10 }]}>Numéro WhatsApp du client :</Text>
            <TextInput
              style={[styles.paymentInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Ex: 771234567"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={customerWhatsApp}
              onChangeText={setCustomerWhatsApp}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowWhatsAppModal(false)}
              >
                <Text style={{ color: colors.text }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#25D366' }]}
                onPress={handleShareWhatsApp}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 26, fontWeight: 'bold' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { marginLeft: 5, fontSize: 13, fontWeight: 'bold' },
  summaryCard: { padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, elevation: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  periodBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  summaryPeriod: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  tabBar: { flexDirection: 'row', marginTop: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontWeight: 'bold', fontSize: 16 },
  list: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12 },
  iconContainer: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15 },
  description: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13, marginTop: 2 },
  rightSide: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: 'bold' },
  debtRemaining: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterModalContent: { width: '85%', padding: 25, borderRadius: 25 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  filterOptionText: { marginLeft: 15, fontSize: 16, fontWeight: '500' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '75%', width: '100%', marginTop: 'auto' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  detailCard: { padding: 20 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 14, marginBottom: 5 },
  detailValue: { fontSize: 17, fontWeight: '600' },
  detailSub: { fontSize: 14 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  paymentSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  paymentInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { marginLeft: 8, fontWeight: 'bold', fontSize: 15 },
  whatsappModal: { width: '80%', padding: 20, borderRadius: 20 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ff4444' },
  deleteBtnText: { fontWeight: '600', fontSize: 14 },
});

export default HistoryScreen;