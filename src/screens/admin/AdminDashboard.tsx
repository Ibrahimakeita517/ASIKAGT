import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../context/authService';
import { User } from '../../models/types';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../context/formatters';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../../context/notificationService';

const AdminDashboard = () => {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const navigation = useNavigation<any>();
  
  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ active: 0, inactive: 0 });
  const [unreadAdmin, setUnreadAdmin] = useState(0);

  const fetchUsers = useCallback(async () => {
    try {
      if (!currentUser) return;

      const [allUsersResult, unreadCountResult] = await Promise.allSettled([
        authService.getAllUsers(),
        notificationService.getAdminUnreadCount()
      ]);

      const allUsers = allUsersResult.status === 'fulfilled' ? allUsersResult.value : [];
      const unreadCount = unreadCountResult.status === 'fulfilled' ? unreadCountResult.value : 0;

      setUnreadAdmin(unreadCount);

      const usersList = Array.isArray(allUsers) ? allUsers : [];
      const filteredUsers = usersList.filter(u => u && u.id && u.id !== currentUser?.id);

      console.log(`[Admin] Marchands chargés: ${filteredUsers.length}`);

      const activeCount = filteredUsers.filter(u => u.status === 'active').length;
      const inactiveCount = filteredUsers.filter(u => u.status === 'inactive').length;

      setUsers(filteredUsers);
      setStats({ active: activeCount, inactive: inactiveCount });
    } catch (error) {
      console.error("Erreur AdminDashboard fetchUsers:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Utiliser navigation.addListener de manière sécurisée
  useEffect(() => {
    if (navigation && typeof navigation.addListener === 'function') {
      const unsubscribe = navigation.addListener('focus', () => {
        fetchUsers();
      });
      return unsubscribe;
    }
  }, [navigation, fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const actionLabel = user.status === 'active' ? 'Désactiver' : 'Activer';

    Alert.alert(
      `${actionLabel} le compte`,
      `Voulez-vous vraiment ${actionLabel.toLowerCase()} le compte de ${user.firstName} ${user.lastName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: actionLabel, 
          style: user.status === 'active' ? "destructive" : "default",
          onPress: async () => {
            await authService.updateUserStatus(user.id, newStatus);
            if (currentUser) {
              await adminService.logActivity(currentUser.id, `${actionLabel} le compte de ${user.firstName} ${user.lastName}`, user.id, `${user.firstName} ${user.lastName}`);
            }
            fetchUsers();
          }
        }
      ]
    );
  };

  const handleTogglePremium = (user: User) => {
    const newStatus = !user.isPremium;
    const actionLabel = newStatus ? 'Activer le mode PREMIUM' : 'Retirer le mode PREMIUM';

    Alert.alert(
      "Gestion Premium",
      `Voulez-vous ${actionLabel.toLowerCase()} pour ${user.firstName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: newStatus ? "Activer Premium" : "Retirer Premium",
          onPress: async () => {
            try {
              await authService.updateUserPremium(user.id, newStatus);
              if (currentUser) {
                await adminService.logActivity(currentUser.id, `${actionLabel} pour ${user.firstName}`, user.id, user.firstName);
              }
              fetchUsers();
            } catch (e) {
              Alert.alert("Erreur", "Impossible de mettre à jour le statut Premium.");
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    if (!item) return null;

    const fName = item.firstName || 'Sans';
    const lName = item.lastName || 'Nom';
    const email = item.email || 'Pas d\'email';

    return (
      <Card style={styles.userCard}>
        <View style={styles.cardHeader}>
          <Avatar firstName={fName} lastName={lName} size={50} />
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.userName, { color: colors.text }]}>{fName} {lName}</Text>
              {item.isPremium && (
                <Ionicons name="star" size={16} color="#FFD700" style={{ marginLeft: 5 }} />
              )}
            </View>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>{email}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? colors.secondary + '20' : colors.danger + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'active' ? colors.secondary : colors.danger }
            ]}>
              {item.status === 'active' ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.debtLabel, { color: colors.textMuted }]}>{item.isPremium ? "Compte Premium" : "Compte Standard"}</Text>
            <Text style={[
              styles.debtAmount,
              { color: item.isPremium ? colors.primary : colors.text }
            ]}>
              {item.isPremium ? 'PREMIUM' : 'STANDARD'}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: item.isPremium ? '#FFD700' : colors.border }]}
              onPress={() => handleTogglePremium(item)}
            >
              <Ionicons
                name={item.isPremium ? "star" : "star-outline"}
                size={20}
                color={item.isPremium ? "#FFD700" : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, marginLeft: 10 }]}
              onPress={() => handleToggleStatus(item)}
            >
              <Ionicons
                name={item.status === 'active' ? "person-remove" : "person-add"}
                size={20}
                color={item.status === 'active' ? colors.danger : colors.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, marginLeft: 10 }]}
              onPress={() => navigation.navigate('AccountDetail', { userId: item.id })}
            >
              <Ionicons name="eye" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tableau de bord Admin</Text>
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('AdminReports')}
          >
            <Text style={[styles.statValue, { color: colors.secondary }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Comptes Actifs</Text>
            <Ionicons name="stats-chart" size={16} color={colors.textMuted} style={{ marginTop: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.surface, marginLeft: 15 }]}
            onPress={() => navigation.navigate('ActivityLogs')}
          >
            <Text style={[styles.statValue, { color: colors.danger }]}>{stats.inactive}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Comptes Inactifs</Text>
            <Ionicons name="list" size={16} color={colors.textMuted} style={{ marginTop: 5 }} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun marchand trouvé</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Messages')}
      >
        <Ionicons name="megaphone" size={24} color="#FFF" />
        {unreadAdmin > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{unreadAdmin}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  statsRow: { flexDirection: 'row' },
  statBox: { flex: 1, padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  list: { padding: 20, paddingBottom: 100 },
  userCard: { marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userEmail: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  debtLabel: { fontSize: 11 },
  debtAmount: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  actions: { flexDirection: 'row' },
  actionBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 30, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF'
  },
  fabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15 }
});

export default AdminDashboard;