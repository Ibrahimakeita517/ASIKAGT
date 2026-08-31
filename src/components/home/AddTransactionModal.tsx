import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { isNotEmpty } from '../../context/validators';
import { transactionService } from '../../context/transactionService';
import { stockService } from '../../context/stockService';
import { TransactionType, Product, Transaction } from '../../models/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Switch } from 'react-native';

interface AddTransactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  type: TransactionType;
  onSuccess: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
  isVisible, 
  onClose, 
  type, 
  onSuccess 
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // États du formulaire
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');

  // États pour les dettes
  const [isDebt, setIsDebt] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // États pour le stock
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Charger les produits quand la modale s'ouvre pour une vente
  useEffect(() => {
    if (isVisible && type === 'sale' && user) {
      loadProducts();
    }
  }, [isVisible, type, user]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await stockService.getProducts(user!.id);
      setProducts(data);
    } catch (e) {
      console.error("Erreur chargement produits:", e);
    } finally {
      setProductsLoading(false);
    }
  };

  const validate = () => {
    let newErrors: any = {};

    // Pour une dette, l'acompte peut être 0 (crédit total)
    const amountVal = Number(amount);
    if (!isNotEmpty(amount) || isNaN(amountVal) || (isDebt ? amountVal < 0 : amountVal <= 0)) {
      newErrors.amount = 'Montant invalide';
    }

    // La description n'est requise que pour les ventes désormais
    if (type === 'sale' && !isNotEmpty(description)) {
      newErrors.description = 'Description requise';
    }
    if (!isNotEmpty(category)) {
      newErrors.category = type === 'sale' ? 'Catégorie requise' : 'Type de dépense requis';
    }

    if (isDebt) {
      const total = Number(totalAmount);
      if (!isNotEmpty(totalAmount) || isNaN(total) || total <= 0) {
        newErrors.totalAmount = 'Total requis';
      } else if (total < amountVal) {
        newErrors.totalAmount = 'Le total doit être >= à l\'acompte';
      }

      if (!isNotEmpty(customerName)) {
        newErrors.customerName = 'Nom du client requis';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setDescription(product.name);
    setCategory(product.category);
    setAmount(product.price.toString());
    setTotalAmount(product.price.toString());
    setQuantity('1');
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedProductId(null);
    setErrors({});
    onClose();
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setLoading(true);
    try {
      const qty = Number(quantity) || 1;
      const valAmount = Number(amount) || 0;

      // Si c'est une dette, l'amount saisi est l'acompte (total)
      // Sinon c'est le prix unitaire * quantité
      const finalAmountEncashed = isDebt ? valAmount : (valAmount * qty);
      const finalTotalSale = isDebt ? Number(totalAmount) : finalAmountEncashed;

      // 1. Enregistrer la transaction (Vente normale ou Dette)
      const transactionData: Omit<Transaction, 'id' | 'createdAt'> = {
        userId: user.id,
        createdById: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim(),
        type: isDebt ? 'debt' : type,
        amount: finalAmountEncashed,
        description: type === 'sale' ? description.trim() : category.trim(),
        category: category.trim(),
        date: new Date().toISOString(),
      };

      if (isDebt) {
        transactionData.customerName = customerName.trim();
        transactionData.customerPhone = customerPhone.trim();
        transactionData.totalAmount = finalTotalSale;
        transactionData.remainingAmount = Math.max(0, finalTotalSale - finalAmountEncashed);
        transactionData.status = transactionData.remainingAmount <= 0 ? 'paid' : 'partially_paid';
      }

      await transactionService.addTransaction(transactionData);
      
      // 2. Si c'est une vente de produit en stock, déduire la quantité localement
      // et ajouter une décrémentation relative à la file de synchro
      if (type === 'sale' && selectedProductId) {
        const product = products.find(p => p.id === selectedProductId);
        if (product) {
          const newQty = product.quantity - qty;
          // Mise à jour locale immédiate
          await stockService.updateQuantity(selectedProductId, newQty > 0 ? newQty : 0);

          // Ajout de la décrémentation relative pour la synchro
          await offlineService.addToSyncQueue({
            id: uuidv4(),
            type: 'DECREMENT_STOCK',
            payload: { productId: selectedProductId, quantity: qty }
          });
        }
      }

      // Réinitialisation et fermeture
      setAmount('');
      setDescription('');
      setCategory('');
      setQuantity('1');
      setSearchQuery('');
      setSelectedProductId(null);
      setIsDebt(false);
      setCustomerName('');
      setCustomerPhone('');
      setTotalAmount('');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer la transaction. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {type === 'sale' ? '➕ Ajouter une Vente' : '➖ Ajouter une Dépense'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {type === 'sale' && products.length > 0 && (
              <View style={styles.stockSection}>
                <Text style={[styles.label, { color: colors.text }]}>Sélectionner un produit :</Text>

                <Input
                  placeholder="🔍 Rechercher un produit..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  containerStyle={styles.searchInput}
                />

                {filteredProducts.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productPicker}>
                    {filteredProducts.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => handleSelectProduct(p)}
                        style={[
                          styles.productChip,
                          {
                            backgroundColor: selectedProductId === p.id ? colors.primary + '20' : colors.surface,
                            borderColor: selectedProductId === p.id ? colors.primary : colors.border
                          }
                        ]}
                      >
                        <Text style={{
                          color: selectedProductId === p.id ? colors.primary : colors.text,
                          fontWeight: selectedProductId === p.id ? 'bold' : 'normal'
                        }}>
                          {p.name}
                        </Text>
                        <Text style={[styles.chipPrice, { color: colors.textMuted }]}>{p.price} F</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.noResult, { color: colors.textMuted }]}>Aucun produit trouvé</Text>
                )}
              </View>
            )}

            {productsLoading && <ActivityIndicator color={colors.primary} style={{ marginBottom: 10 }} />}

            <Input
              label={type === 'sale' ? (isDebt ? "Acompte payé (FCFA)" : "Montant (FCFA)") : "Montant (FCFA)"}
              placeholder="Ex: 5000"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              error={errors.amount}
            />

            {type === 'sale' && (
              <View style={[styles.debtToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.debtInfo}>
                  <MaterialCommunityIcons name="hand-coin-outline" size={24} color={isDebt ? colors.primary : colors.textMuted} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.debtLabel, { color: colors.text }]}>Vente à crédit ?</Text>
                    <Text style={[styles.debtSub, { color: colors.textMuted }]}>Le client doit encore de l'argent</Text>
                  </View>
                </View>
                <Switch
                  value={isDebt}
                  onValueChange={setIsDebt}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'android' ? (isDebt ? colors.primary : '#f4f3f4') : ''}
                />
              </View>
            )}

            {isDebt && (
              <View style={[styles.debtFields, { backgroundColor: colors.primary + '05', padding: 10, borderRadius: 12, marginBottom: 15 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: '48%' }}>
                    <Input
                      label="Total (FCFA)"
                      placeholder="Ex: 15000"
                      keyboardType="numeric"
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      error={errors.totalAmount}
                      style={{ height: 40 }}
                    />
                  </View>
                  <View style={{ width: '48%' }}>
                    <Input
                      label="Nom Client"
                      placeholder="M. Keita"
                      value={customerName}
                      onChangeText={setCustomerName}
                      error={errors.customerName}
                      style={{ height: 40 }}
                    />
                  </View>
                </View>
                <Input
                  label="Téléphone"
                  placeholder="77 123 45 67"
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  style={{ height: 40 }}
                />
              </View>
            )}

            {type === 'sale' && (
              <Input
                label="Quantité"
                placeholder="1"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />
            )}

            {type === 'sale' && (
              <Input
                label="Description"
                placeholder="Ex: Vente de 2 sacs de riz"
                value={description}
                onChangeText={setDescription}
                error={errors.description}
              />
            )}

            <Input
              label={type === 'sale' ? "Catégorie" : "Type de dépense"}
              placeholder={type === 'sale' ? "Ex: Alimentation" : "Ex: Loyer, Transport, Facture..."}
              value={category}
              onChangeText={setCategory}
              error={errors.category}
            />

            <Button
              title="Enregistrer"
              type={type === 'sale' ? 'secondary' : 'danger'}
              onPress={handleSave}
              loading={loading}
              style={styles.submitBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 10,
    maxHeight: '85%'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 18, fontWeight: 'bold' },
  submitBtn: { marginTop: 10, marginBottom: 10 },
  stockSection: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  productPicker: { flexDirection: 'row' },
  productChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, marginRight: 8, alignItems: 'center', minWidth: 70 },
  chipPrice: { fontSize: 9, marginTop: 1 },
  searchInput: { marginBottom: 8, height: 40 },
  noResult: { fontSize: 12, fontStyle: 'italic', paddingVertical: 5, textAlign: 'center' },
  debtToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 10
  },
  debtInfo: { flexDirection: 'row', alignItems: 'center' },
  debtLabel: { fontSize: 14, fontWeight: '600' },
  debtSub: { fontSize: 11 },
  debtFields: { marginBottom: 5 },
});
