import { supabase } from '../services/supabase';
import { Product, StockEntry } from '../models/types';
import {
  mapSupabaseProductToAppProduct,
  mapAppProductToSupabaseInsert,
  mapAppStockEntryToSupabaseInsert,
  mapSupabaseStockEntryToAppStockEntry
} from '../utils/supabaseMappers';

export const stockService = {
  // Récupérer tous les produits du marchand
  getProducts: async (userId: string): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapSupabaseProductToAppProduct);
  },

  // Ajouter un nouveau produit
  addProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const { data, error } = await supabase
      .from('products')
      .insert(mapAppProductToSupabaseInsert(product))
      .select()
      .single();
    
    if (error) {
      console.error("Erreur addProduct:", error.message);
      throw new Error("Erreur table produits: " + error.message);
    }

    const newProduct = mapSupabaseProductToAppProduct(data);

    // Logger l'entrée de stock initiale (Optionnel, ne doit pas bloquer l'ajout)
    try {
      await stockService.logStockEntry({
        productId: newProduct.id,
        productName: newProduct.name,
        quantityAdded: newProduct.quantity,
        purchasePrice: newProduct.purchasePrice,
        date: new Date().toISOString(),
        userId: newProduct.userId
      });
    } catch (e) {
      console.warn("Impossible de logger l'entrée initiale:", e);
    }

    return newProduct;
  },

  // Mettre à jour un produit
  updateProduct: async (productId: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>, oldProduct?: Product) => {
    const { error } = await supabase
      .from('products')
      .update(mapAppProductToSupabaseInsert(updates as any))
      .eq('id', productId);

    if (error) throw error;

    // Si la quantité a augmenté, logger l'entrée
    if (oldProduct && updates.quantity !== undefined && updates.quantity > oldProduct.quantity) {
      await stockService.logStockEntry({
        productId: productId,
        productName: updates.name || oldProduct.name,
        quantityAdded: updates.quantity - oldProduct.quantity,
        purchasePrice: updates.purchasePrice || oldProduct.purchasePrice,
        date: new Date().toISOString(),
        userId: oldProduct.userId
      });
    }
  },

  // Supprimer un produit
  deleteProduct: async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  },

  // Mettre à jour la quantité (ex: après une vente)
  updateQuantity: async (productId: string, newQuantity: number) => {
    await supabase.from('products').update({ quantity: newQuantity }).eq('id', productId);
  },

  // Logger une entrée de stock
  logStockEntry: async (entry: Omit<StockEntry, 'id'>) => {
    try {
      const { error } = await supabase
        .from('stock_entries')
        .insert(mapAppStockEntryToSupabaseInsert(entry));

      if (error) {
        console.warn("La table stock_entries n'existe probablement pas encore:", error.message);
      }
    } catch (e) {
      console.warn("Erreur lors du logging (optionnel):", e);
    }
  },

  // Récupérer l'historique des entrées
  getStockEntries: async (userId: string): Promise<StockEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.warn("Erreur getStockEntries (table manquante ?):", error.message);
        return []; // Retourne une liste vide au lieu de faire planter l'app
      }
      return (data || []).map(mapSupabaseStockEntryToAppStockEntry);
    } catch (e) {
      return [];
    }
  }
};
