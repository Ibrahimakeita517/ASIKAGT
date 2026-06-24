import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
  RefreshControl
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../context/authService';
import { adminService } from '../../context/adminService';
import { notificationService } from '../../context/notificationService';
import { User, Message } from '../../models/types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatRelativeDate } from '../../context/formatters';

const MessagingScreen = () => {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const navigation = useNavigation();

  const [users, setUsers] = useState<User[]>([]);
  const [incomingMessages, setIncomingMessages] = useState<Message[]>([]);
  const [recipientId, setRecipientId] = useState<'all' | string>('all');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');

  const fetchData = useCallback(async () => {
    try {
      // On charge les messages en priorité
      const messages = await notificationService.getAdminMessages();
      setIncomingMessages(messages || []);

      // Puis on tente de charger les utilisateurs, mais sans bloquer si ça échoue
      try {
        const allUsers = await authService.getAllUsers();
        if (allUsers) {
          setUsers(allUsers.filter(u => u.role === 'merchant'));
        }
      } catch (e) {
        console.log("Note: Impossible de charger la liste complète des utilisateurs");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Erreur', 'Le message ne peut pas être vide.');
      return;
    }

    if (!currentUser) return;

    setLoading(true);
    try {
      await adminService.sendMessage({
        senderId: currentUser.id,
        receiverId: recipientId,
        content: message.trim(),
      });
      
      Alert.alert('Succès', 'Message envoyé avec succès !');
      setMessage('');
      if (recipientId !== 'all') {
        setActiveTab('inbox');
        fetchData();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le message.");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (msg: Message) => {
    setRecipientId(msg.senderId);
    setActiveTab('compose');
    const sender = users.find(u => u.id === msg.senderId);
    setMessage(`En réponse à votre message : "${msg.content.substring(0, 20)}..." \n\n`);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const sender = users.find(u => u.id === item.senderId);
    const unreadStyle = !item.isRead ? { borderLeftWidth: 4, borderLeftColor: colors.primary } : {};

    return (
      <Card key={item.id} style={{ ...styles.msgCard, ...unreadStyle }}>
        <View style={styles.msgHeader}>
          <View style={styles.senderInfo}>
            <Text style={[styles.senderName, { color: colors.text }]}>
              {sender ? `${sender.firstName} ${sender.lastName}` : 'Chargement nom...'}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.typeText, { color: colors.primary }]}>
                {item.type || 'Message'}
              </Text>
            </View>
          </View>
          <Text style={[styles.msgDate, { color: colors.textMuted }]}>
            {item.sentAt ? formatRelativeDate(item.sentAt) : ''}
          </Text>
        </View>
        <Text style={[styles.msgContent, { color: colors.text }]}>{item.content}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>ID: {item.senderId.substring(0,8)}...</Text>
          <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(item)}>
            <Ionicons name="arrow-undo" size={16} color={colors.primary} />
            <Text style={[styles.replyText, { color: colors.primary }]}>Répondre</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const selectedRecipient = recipientId === 'all' 
    ? 'Tous les utilisateurs' 
    : users.find(u => u.id === recipientId);
  
  const recipientName = typeof selectedRecipient === 'string' 
    ? selectedRecipient 
    : `${selectedRecipient?.firstName} ${selectedRecipient?.lastName}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Centre de Messages</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'inbox' ? colors.primary : colors.textMuted }]}>Reçus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'compose' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'compose' ? colors.primary : colors.textMuted }]}>Écrire</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'inbox' ? (
        <FlatList
          data={incomingMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-unread-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun message reçu</Text>
            </View>
          }
        />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Card style={styles.card}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Destinataire</Text>
              <TouchableOpacity 
                style={[styles.pickerToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowPicker(!showPicker)}
              >
                <Text style={{ color: colors.text }}>{recipientName}</Text>
                <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {showPicker && (
                <View style={[styles.pickerList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => { setRecipientId('all'); setShowPicker(false); }}
                  >
                    <Text style={{ color: recipientId === 'all' ? colors.primary : colors.text }}>📢 Tous les marchands</Text>
                  </TouchableOpacity>
                  {users.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.pickerItem}
                      onPress={() => { setRecipientId(u.id); setShowPicker(false); }}
                    >
                      <Text style={{ color: recipientId === u.id ? colors.primary : colors.text }}>
                        👤 {u.firstName} {u.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.inputGap} />

              <Text style={[styles.label, { color: colors.textMuted }]}>Message</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border
                  }
                ]}
                multiline
                numberOfLines={6}
                placeholder="Écrivez votre message ici..."
                placeholderTextColor={colors.textMuted}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />

              <Button
                title="Envoyer le message"
                onPress={handleSend}
                loading={loading}
                style={styles.sendBtn}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backBtn: { padding: 5, marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  tabText: { fontSize: 16, fontWeight: 'bold' },
  list: { padding: 20 },
  msgCard: { marginBottom: 15, padding: 15 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 16, fontWeight: 'bold' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  typeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  msgDate: { fontSize: 11 },
  msgContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  replyText: { marginLeft: 5, fontSize: 13, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  card: { padding: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  pickerToggle: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  pickerList: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 10,
  },
  pickerItem: {
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  inputGap: { height: 20 },
  textArea: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  sendBtn: { marginTop: 30 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, marginTop: 15 }
});

export default MessagingScreen;