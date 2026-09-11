import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { formatCurrency } from '../../context/formatters';
import { Product, StockEntry } from '../../models/types';
import { stockService } from '../../context/stockService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const StockScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // États pour la gestion des modales, filtres et formulaires
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [newProduct, setNewProduct] = useState({
    name: '',
    purchasePrice: '',
    price: '',
    quantity: '',
    category: 'Général'
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const ownerId = user.id;
      const productsData = await stockService.getProducts(ownerId);
      setProducts(productsData || []);

      try {
        const entriesData = await stockService.getStockEntries(ownerId);
        setStockEntries(entriesData || []);
      } catch (e) {
        console.log("Note: Historique indisponible");
      }
    } catch (error: any) {
      console.error("Erreur chargement stock:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // const toggleLock = () => {
  //   // setIsLocked(!isLocked);
  // };

  const handleAddProduct = async () => {
    if (!user) return;

    // Validation des champs
    if (!newProduct.name || !newProduct.price || !newProduct.quantity || !newProduct.purchasePrice) {
      const msg = "Veuillez remplir tous les champs : Nom, Prix Achat, Prix Vente et Quantité.";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Champs manquants", msg);
      return;
    }

    try {
      const productData = {
        name: newProduct.name,
        purchasePrice: parseFloat(newProduct.purchasePrice.replace(',', '.')),
        price: parseFloat(newProduct.price.replace(',', '.')),
        quantity: parseInt(newProduct.quantity),
        category: newProduct.category,
        userId: user.id
      };

      if (isEditing && editingProductId) {
        await stockService.updateProduct(editingProductId, productData, user.id);
        // Mise à jour locale avec les nouvelles données
        setProducts(prev => prev.map(p => p.id === editingProductId ? { ...p, ...productData } : p));
      } else {
        // On récupère le vrai produit avec son ID définitif
        const addedProduct = await stockService.addProduct(productData);
        setProducts(prev => [addedProduct, ...prev]);
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Erreur opération produit:", error);
      Alert.alert("Erreur", "Impossible de sauvegarder le produit.");
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProductId) return;

    const confirmDelete = () => {
      return new Promise((resolve) => {
        if (Platform.OS === 'web') {
          const result = window.confirm("Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.");
          resolve(result);
        } else {
          Alert.alert(
            "Supprimer le produit",
            "Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.",
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
      setIsLoading(true);

      // 1. Suppression dans le service avec l'ID utilisateur pour la sécurité
      await stockService.deleteProduct(editingProductId, user.id);

      // 2. Mise à jour immédiate de la liste locale
      setProducts(prev => prev.filter(p => p.id !== editingProductId));

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", "Impossible de supprimer le produit");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewProduct({ name: '', purchasePrice: '', price: '', quantity: '', category: 'Général' });
    setIsEditing(false);
    setEditingProductId(null);
  };

  const openEditModal = (product: Product) => {
    setNewProduct({
      name: product.name,
      purchasePrice: product.purchasePrice?.toString() || '',
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      category: product.category || 'Général'
    });
    setEditingProductId(product.id);
    setIsEditing(true);
    setShowModal(true);
  };

  // Filtrage de l'historique
  const filteredEntries = useMemo(() => {
    if (historyFilter === 'all') return stockEntries;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return stockEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });
  }, [stockEntries, historyFilter]);

  // Calculs financiers
  const totalStockValue = products.reduce((total, p) => total + (p.price * p.quantity), 0);
  const totalPurchaseValue = products.reduce((total, p) => total + ((p.purchasePrice || 0) * p.quantity), 0);
  const netProfit = totalStockValue - totalPurchaseValue;

  const renderProduct = ({ item }: { item: Product }) => {
    const unitProfit = item.price - (item.purchasePrice || 0);

    return (
      <TouchableOpacity onPress={() => openEditModal(item)}>
        <Card style={styles.productCard}>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.productDetails, { color: colors.textMuted }]}>
              Achat: {formatCurrency(item.purchasePrice || 0)} | Vente: {formatCurrency(item.price)}
            </Text>
            <Text style={[styles.profitLabel, { color: colors.secondary }]}>
              Bénéfice net/unité: +{formatCurrency(unitProfit)}
            </Text>
          </View>
          <View style={styles.productValues}>
            <View style={[styles.qtyBadge, { backgroundColor: item.quantity < 5 ? colors.danger + '20' : colors.secondary + '20' }]}>
              <Text style={[styles.qtyText, { color: item.quantity < 5 ? colors.danger : colors.secondary }]}>
                Stock: {item.quantity}
              </Text>
            </View>
            <Ionicons name="pencil" size={16} color={colors.primary} style={{ marginTop: 5 }} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Gestion du Stock</Text>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)} style={styles.historyLink}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.historyLinkText, { color: colors.primary }]}>Historique des entrées</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Valeur Stock</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(totalStockValue)}</Text>
        </Card>
        <Card style={styles.statCardWithMargin}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Solde Net (Profit)</Text>
          <Text style={[styles.statValue, { color: colors.secondary }]}>{formatCurrency(netProfit)}</Text>
        </Card>
      </View>

      {isLoading && products.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          onRefresh={loadData}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.empty, { color: colors.textMuted }]}>Aucun produit en stock</Text>
              <TouchableOpacity onPress={() => {
                setShowModal(true);
              }}>
                <Text style={{ color: colors.primary, marginTop: 10 }}>Ajouter votre premier produit</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal d'ajout/édition */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {isEditing ? 'Modifier Produit' : 'Nouveau Produit'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Nom du produit</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Ex: Sac de Riz"
                  placeholderTextColor={colors.textMuted}
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({...newProduct, name: text})}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.label, { color: colors.text }]}>Prix Achat</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                      placeholder="0"
                      keyboardType="numeric"
                      value={newProduct.purchasePrice}
                      onChangeText={(text) => setNewProduct({...newProduct, purchasePrice: text})}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>Prix Vente</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                      placeholder="0"
                      keyboardType="numeric"
                      value={newProduct.price}
                      onChangeText={(text) => setNewProduct({...newProduct, price: text})}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>
                  {isEditing ? 'Nouvelle Quantité Totale' : 'Quantité initiale'}
                </Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  placeholder="0"
                  keyboardType="numeric"
                  value={newProduct.quantity}
                  onChangeText={(text) => setNewProduct({...newProduct, quantity: text})}
                />
                {isEditing && (
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 5 }}>
                    Note: Si vous augmentez la quantité, une entrée sera enregistrée dans l'historique.
                  </Text>
                )}

                {newProduct.price && newProduct.purchasePrice && (
                  <View style={styles.profitPreview}>
                    <Text style={{ color: colors.textMuted }}>Bénéfice estimé : </Text>
                    <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>
                      {formatCurrency(parseFloat(newProduct.price.replace(',', '.') || '0') - parseFloat(newProduct.purchasePrice.replace(',', '.') || '0'))} / unité
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddProduct}
                >
                  <Text style={styles.submitBtnText}>
                    {isEditing ? 'Enregistrer les modifications' : 'Ajouter au stock'}
                  </Text>
                </TouchableOpacity>

                {isEditing && (
                  <TouchableOpacity
                    style={[styles.deleteBtn]}
                    onPress={handleDeleteProduct}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Supprimer le produit</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Historique des Entrées */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Historique des Entrées</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Suivi des ajouts de stock</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, historyFilter === 'all' && { backgroundColor: colors.primary }]}
                onPress={() => setHistoryFilter('all')}
              >
                <Text style={[styles.filterChipText, historyFilter === 'all' && { color: '#FFF' }]}>Tout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, historyFilter === 'month' && { backgroundColor: colors.primary }]}
                onPress={() => setHistoryFilter('month')}
              >
                <Text style={[styles.filterChipText, historyFilter === 'month' && { color: '#FFF' }]}>Ce mois</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.entryItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryProductName, { color: colors.text }]}>{item.productName}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>+{item.quantityAdded}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      Achat: {formatCurrency(item.purchasePrice)}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Text style={{ color: colors.textMuted }}>Aucun historique d'entrée</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  historyLink: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  historyLinkText: { fontSize: 13, marginLeft: 5, textDecorationLine: 'underline' },
  lockBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  summaryContainer: { paddingHorizontal: 20, marginBottom: 15, flexDirection: 'row' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  statCardWithMargin: { flex: 1, alignItems: 'center', paddingVertical: 15, marginLeft: 10 },
  statLabel: { fontSize: 12, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  list: { padding: 20, paddingBottom: 100 },
  productCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 17, fontWeight: 'bold' },
  productDetails: { fontSize: 13, marginTop: 4 },
  profitLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  productValues: { alignItems: 'flex-end' },
  qtyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  qtyText: { fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  empty: { textAlign: 'center', marginTop: 10, fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  label: { fontSize: 14, marginBottom: 8, marginTop: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16 },
  row: { flexDirection: 'row' },
  profitPreview: { marginTop: 20, padding: 15, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  submitBtn: { marginTop: 30, padding: 18, borderRadius: 15, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { marginTop: 15, padding: 15, alignItems: 'center', marginBottom: 30 },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },

  filterRow: { flexDirection: 'row', marginBottom: 15 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 10 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  entryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  entryProductName: { fontSize: 15, fontWeight: '600' }
});

export default StockScreen;
