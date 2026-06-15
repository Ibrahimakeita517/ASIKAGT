import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../models/ThemeContext';
import { authService } from '../../context/authService';
import { transactionService } from '../../context/transactionService';
import { User, Transaction } from '../../models/types';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency, formatFullDate, formatRelativeDate } from '../../context/formatters';
import { notificationService } from '../../context/notificationService';
import { useAuth } from '../../context/AuthContext';
import { Modal } from 'react-native';

const AccountDetail = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { userId } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [debtValue, setDebtValue] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const { user: currentUser } = useAuth();

  const loadData = useCallback(async () => {
    try {
      const allUsers = await authService.getAllUsers();
      const foundUser = allUsers.find(u => u.id === userId);
      if (foundUser) {
        setUser(foundUser);
        setDebtValue(foundUser.debt.toString());
        setExpiryValue(foundUser.subscriptionExpiry.split('T')[0]); // YYYY-MM-DD
        const history = await transactionService.getTransactions(userId);
        setTransactions(history);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données du compte.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateDebt = async () => {
    if (isNaN(Number(debtValue))) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide.');
      return;
    }

    try {
      await authService.updateUserDebt(userId, Number(debtValue));
      setIsEditingDebt(false);
      loadData();
      Alert.alert('Succès', 'Dette mise à jour avec succès.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la dette.');
    }
  };

  const handleUpdateExpiry = async () => {
    try {
      // Vérifier le format de date simple YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expiryValue)) {
        Alert.alert('Erreur', 'Format de date invalide. Utilisez AAAA-MM-JJ');
        return;
      }

      const newExpiry = new Date(expiryValue).toISOString();
      await authService.updateUserSubscription(userId, newExpiry);
      setIsEditingExpiry(false);
      loadData();
      Alert.alert('Succès', 'Date d\'expiration mise à jour.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la date.');
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await authService.updateUserStatus(userId, newStatus);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de changer le statut.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;

    setSendingMessage(true);
    try {
      const success = await notificationService.sendMessage(currentUser.id, userId, messageText);
      if (success) {
        Alert.alert('Succès', 'Message envoyé avec succès.');
        setMessageText('');
        setIsMessageModalVisible(false);
      } else {
        Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Détails du Compte</Text>
      </View>

      <View style={styles.profileSection}>
        <Avatar firstName={user.firstName} lastName={user.lastName} size={100} />
        <Text style={[styles.name, { color: colors.text }]}>{user.firstName} {user.lastName}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
        
        <View style={[styles.statusRow, { backgroundColor: user.status === 'active' ? colors.secondary + '20' : colors.danger + '20' }]}>
           <Text style={[styles.statusText, { color: user.status === 'active' ? colors.secondary : colors.danger }]}>
             Compte {user.status === 'active' ? 'Actif' : 'Inactif'}
           </Text>
        </View>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Opérations effectuées</Text>
          <Text style={[styles.infoValue, { color: colors.text, fontWeight: 'bold' }]}>{transactions.length}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Inscrit le</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{formatFullDate(user.createdAt)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date d'expiration</Text>
            {isEditingExpiry ? (
              <View style={{ marginTop: 10 }}>
                <Input
                  label="Format: AAAA-MM-JJ"
                  value={expiryValue}
                  onChangeText={setExpiryValue}
                  placeholder="2024-12-31"
                />
                <View style={styles.btnRow}>
                  <Button title="Annuler" type="outline" onPress={() => setIsEditingExpiry(false)} style={styles.flexBtn} />
                  <Button title="OK" onPress={handleUpdateExpiry} style={styles.flexBtnMargin} />
                </View>
              </View>
            ) : (
              <Text style={[styles.infoValue, { color: new Date(user.subscriptionExpiry) < new Date() ? colors.danger : colors.text }]}>
                {formatFullDate(user.subscriptionExpiry)}
              </Text>
            )}
          </View>
          {!isEditingExpiry && (
            <TouchableOpacity onPress={() => setIsEditingExpiry(true)} style={{ padding: 5 }}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <Card style={styles.debtCard}>
        <View style={styles.debtHeader}>
           <Text style={[styles.cardTitle, { color: colors.text }]}>Gestion de la dette</Text>
           {!isEditingDebt && (
             <TouchableOpacity onPress={() => setIsEditingDebt(true)}>
               <Ionicons name="create-outline" size={24} color={colors.primary} />
             </TouchableOpacity>
           )}
        </View>

        {isEditingDebt ? (
          <View>
            <Input 
              label="Nouveau montant (FCFA)"
              keyboardType="numeric"
              value={debtValue}
              onChangeText={setDebtValue}
            />
            <View style={styles.btnRow}>
              <Button title="Annuler" type="outline" onPress={() => setIsEditingDebt(false)} style={styles.flexBtn} />
              <Button title="Enregistrer" onPress={handleUpdateDebt} style={styles.flexBtnMargin} />
            </View>
          </View>
        ) : (
          <Text style={[styles.debtAmount, { color: user.debt > 0 ? colors.danger : colors.text }]}>
            {formatCurrency(user.debt)}
          </Text>
        )}
      </Card>

      <View style={styles.actionSection}>
        <Button 
          title={user.status === 'active' ? "Désactiver le compte" : "Activer le compte"} 
          type={user.status === 'active' ? 'danger' : 'secondary'}
          onPress={handleToggleStatus}
        />
        <Button 
          title="Envoyer un message" 
          type="outline" 
          onPress={() => setIsMessageModalVisible(true)}
          style={{ marginTop: 10 }}
        />
      </View>

      <Modal visible={isMessageModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Message pour {user.firstName}</Text>
              <TouchableOpacity onPress={() => setIsMessageModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label="Contenu du message"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
              placeholder="Écrivez votre message ici..."
            />

            <Button
              title="Envoyer le message"
              onPress={handleSendMessage}
              loading={sendingMessage}
              disabled={!messageText.trim()}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>

      <View style={styles.historySection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Historique récent</Text>
        {transactions.slice(0, 10).map((t) => (
          <View key={t.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.historyDesc, { color: colors.text }]}>{t.description}</Text>
              <Text style={[styles.historyDate, { color: colors.textMuted }]}>{formatRelativeDate(t.date)}</Text>
            </View>
            <Text style={[styles.historyAmount, { color: t.type === 'sale' ? colors.secondary : colors.danger }]}>
              {t.type === 'sale' ? '+' : '-'} {formatCurrency(t.amount)}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune transaction pour ce compte.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  profileSection: { alignItems: 'center', marginVertical: 20 },
  name: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  email: { fontSize: 14, marginTop: 4 },
  statusRow: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  infoCard: { marginHorizontal: 20, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 2 },
  debtCard: { marginHorizontal: 20, marginBottom: 20 },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  debtAmount: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  btnRow: { flexDirection: 'row', marginTop: 10 },
  flexBtn: { flex: 1 },
  flexBtnMargin: { flex: 1, marginLeft: 10 },
  actionSection: { paddingHorizontal: 20, marginBottom: 20 },
  historySection: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  historyDesc: { fontSize: 15, fontWeight: '500' },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' }
});

export default AccountDetail;