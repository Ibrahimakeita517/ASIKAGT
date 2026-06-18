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
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { isNotEmpty } from '../../context/validators';
import { transactionService } from '../../context/transactionService';
import { stockService } from '../../context/stockService';
import { TransactionType, Product } from '../../models/types';
import { Ionicons } from '@expo/vector-icons';

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
    if (!isNotEmpty(amount) || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Montant invalide';
    }
    // La description n'est requise que pour les ventes désormais
    if (type === 'sale' && !isNotEmpty(description)) {
      newErrors.description = 'Description requise';
    }
    if (!isNotEmpty(category)) {
      newErrors.category = type === 'sale' ? 'Catégorie requise' : 'Type de dépense requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setDescription(product.name);
    setCategory(product.category);
    setAmount(product.price.toString());
    setQuantity('1'); // Quantité 1 par défaut comme demandé
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setLoading(true);
    try {
      await transactionService.addTransaction({
        userId: user.id,
        type,
        amount: Number(amount) * Number(quantity || 1),
        // Si c'est une dépense, on utilise la catégorie comme description
        description: type === 'sale' ? description.trim() : category.trim(),
        category: category.trim(),
        date: new Date().toISOString(),
      });
      
      // Réinitialisation et fermeture
      setAmount('');
      setDescription('');
      setCategory('');
      setQuantity('1');
      setSelectedProductId(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {type === 'sale' ? '➕ Ajouter une Vente' : '➖ Ajouter une Dépense'}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {type === 'sale' && products.length > 0 && (
                <View style={styles.stockSection}>
                  <Text style={[styles.label, { color: colors.text }]}>Sélectionner un produit :</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productPicker}>
                    {products.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => handleSelectProduct(p)}
                        style={[
                          styles.productChip,
                          { backgroundColor: colors.surface, borderColor: selectedProductId === p.id ? colors.primary : colors.border }
                        ]}
                      >
                        <Text style={{ color: selectedProductId === p.id ? colors.primary : colors.text }}>{p.name}</Text>
                        <Text style={[styles.chipPrice, { color: colors.textMuted }]}>{p.price} F</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {productsLoading && <ActivityIndicator color={colors.primary} style={{ marginBottom: 10 }} />}

              <Input
                label="Montant (FCFA)"
                placeholder="Ex: 5000"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                error={errors.amount}
              />

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
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  submitBtn: { marginTop: 10 },
  stockSection: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  productPicker: { flexDirection: 'row' },
  productChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, alignItems: 'center' },
  chipPrice: { fontSize: 10, marginTop: 2 },
});