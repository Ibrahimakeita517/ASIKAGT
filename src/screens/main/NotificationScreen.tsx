import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { notificationService } from '../../context/notificationService';
import { Message } from '../../models/types';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeDate } from '../../context/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const NotificationScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // États pour envoyer un message
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messageType, setMessageType] = useState<'support' | 'reclamation' | 'info'>('support');
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = async () => {
    if (!user) return;
    const data = await notificationService.getMessages(user.id);
    setMessages(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const handleSendMessage = async () => {
    if (!user || !messageContent.trim()) return;
    setSending(true);
    const success = await notificationService.sendMessage(user.id, 'admin', messageContent, messageType);
    if (success) {
      setMessageContent('');
      setIsModalVisible(false);
      loadMessages();
    }
    setSending(false);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isFromMe = item.senderId === user?.id;
    return (
      <TouchableOpacity
        style={[
          styles.messageItem,
          { backgroundColor: colors.surface },
          !item.isRead && !isFromMe && { borderLeftWidth: 4, borderLeftColor: colors.primary },
          isFromMe && { alignSelf: 'flex-end', opacity: 0.8, backgroundColor: colors.primary + '10' }
        ]}
        onPress={() => !isFromMe && handleMarkAsRead(item.id)}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={item.receiverId === 'all' ? "megaphone-outline" : isFromMe ? "send-outline" : "mail-outline"}
            size={20}
            color={item.isRead ? colors.textMuted : colors.primary}
          />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.msgHeader}>
            <Text style={[styles.typeLabel, { color: colors.primary }]}>
              {item.type === 'reclamation' ? 'Réclamation' : item.type === 'support' ? 'Support' : 'Info'}
            </Text>
            {isFromMe && <Text style={[styles.meTag, { color: colors.textMuted }]}>Moi</Text>}
          </View>
          <Text style={[
            styles.content,
            { color: colors.text },
            !item.isRead && !isFromMe && { fontWeight: 'bold' }
          ]}>
            {item.content}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatRelativeDate(item.sentAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Messages & Support</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.newBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun message</Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Contacter l'administrateur</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Type de demande</Text>
            <View style={styles.typeRow}>
              {(['support', 'reclamation', 'info'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: colors.border },
                    messageType === t && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setMessageType(t)}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: colors.text },
                    messageType === t && { color: '#FFF' }
                  ]}>
                    {t === 'support' ? 'Support' : t === 'reclamation' ? 'Réclamation' : 'Amélioration'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Votre message"
              placeholder="Expliquez votre problème ou suggestion..."
              multiline
              numberOfLines={5}
              value={messageContent}
              onChangeText={setMessageContent}
            />

            <Button
              title="Envoyer le message"
              onPress={handleSendMessage}
              loading={sending}
              disabled={!messageContent.trim()}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  newBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  newBtnText: { color: '#FFF', marginLeft: 5, fontWeight: 'bold' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  messageItem: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxWidth: '90%'
  },
  iconContainer: { marginRight: 12, justifyContent: 'center' },
  contentContainer: { flex: 1 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  typeLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  meTag: { fontSize: 11, fontStyle: 'italic' },
  content: { fontSize: 15, lineHeight: 20 },
  date: { fontSize: 11, marginTop: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  typeRow: { flexDirection: 'row', marginBottom: 20 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, marginRight: 8 },
  typeChipText: { fontSize: 12 },
});

export default NotificationScreen;