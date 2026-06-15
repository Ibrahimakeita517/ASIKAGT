import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../context/transactionService';
import { stockService } from '../../context/stockService';
import { aiService } from '../../services/aiService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const StatsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Bonjour ${user?.firstName || 'Commerçant'} ! Je suis ASIKA AI. Comment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date()
    }
  ]);
  const [userPrompt, setUserPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [businessContext, setBusinessContext] = useState<any>(null);

  const flatListRef = useRef<FlatList>(null);

  const loadBusinessContext = useCallback(async () => {
    if (!user) return;
    try {
      const summary = await transactionService.getDailyStats(user.id);
      const transactions = await transactionService.getTransactions(user.id);
      const products = await stockService.getProducts(user.id);
      setBusinessContext({ summary, transactions, products });
    } catch (error) {
      console.error("Erreur contexte IA:", error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadBusinessContext();
    }, [loadBusinessContext])
  );

  const sendMessage = async (customPrompt?: string) => {
    const text = customPrompt || userPrompt;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setUserPrompt("");
    setAiLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await aiService.analyzeData(
        {
          user,
          products: businessContext?.products || [],
          transactions: businessContext?.transactions || [],
          summary: businessContext?.summary || {}
        },
        text
      );

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      Alert.alert("Erreur", "L'assistant ASIKA AI est indisponible. Vérifiez votre connexion.");
    } finally {
      setAiLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAssistant = item.role === 'assistant';
    return (
      <View style={[styles.messageWrapper, isAssistant ? styles.assistantWrapper : styles.userWrapper]}>
        {isAssistant && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
          </View>
        )}
        <View style={[styles.messageBubble, isAssistant ? { backgroundColor: colors.surface } : { backgroundColor: colors.primary }]}>
          <Text style={[styles.messageText, { color: isAssistant ? colors.text : '#FFF' }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>ASIKA AI</Text>
        <TouchableOpacity onPress={() => setMessages([messages[0]])}>
          <Ionicons name="refresh-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={() => (
          aiLoading ? (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        )}
      />

      <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Posez votre question..."
            placeholderTextColor={colors.textMuted}
            value={userPrompt}
            onChangeText={setUserPrompt}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: userPrompt.trim() ? colors.primary : colors.textMuted + '30' }]}
            onPress={() => sendMessage()}
            disabled={!userPrompt.trim() || aiLoading}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  chatList: { padding: 20, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 15, maxWidth: '85%' },
  assistantWrapper: { alignSelf: 'flex-start' },
  userWrapper: { alignSelf: 'flex-end' },
  avatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 4 },
  messageBubble: { padding: 12, borderRadius: 18 },
  messageText: { fontSize: 15, lineHeight: 22 },
  loadingBubble: { marginLeft: 20, marginBottom: 20 },
  inputContainer: { padding: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  input: { flex: 1, paddingVertical: 8, fontSize: 15, marginRight: 10, maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});

export default StatsScreen;
