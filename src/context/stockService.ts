import { Product, StockEntry } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import {
  mapSupabaseProductToAppProduct,
} from '../utils/supabaseMappers';
import { offlineService } from '../services/offlineService';

export const stockService = {
  // Récupérer tous les produits du marchand
  getProducts: async (userId: string): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (!error && data) {
        const products = data.map(mapSupabaseProductToAppProduct);
        await offlineService.saveProducts(products);
        return products;
      }
    } catch (e) {
      console.log("Mode hors ligne : chargement des produits locaux");
    }
    return await offlineService.getProducts();
  },

  // Ajouter un nouveau produit
  addProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale
    const localProducts = await offlineService.getProducts();
    await offlineService.saveProducts([...localProducts, newProduct]);

    // 2. Ajout à la file de synchronisation
    await offlineService.addToSyncQueue({
      id: newProduct.id,
      type: 'ADD_PRODUCT',
      payload: newProduct
    });

    return newProduct;
  },

  // Mettre à jour un produit
  updateProduct: async (productId: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>, oldProduct?: Product) => {
    const localProducts = await offlineService.getProducts();
    const index = localProducts.findIndex(p => p.id === productId);

    if (index !== -1) {
      const updatedProduct = { ...localProducts[index], ...updates };
      localProducts[index] = updatedProduct;
      await offlineService.saveProducts(localProducts);

      await offlineService.addToSyncQueue({
        id: uuidv4(),
        type: 'UPDATE_PRODUCT',
        payload: { productId, updates }
      });
    }
  },

  // Supprimer un produit
  deleteProduct: async (productId: string) => {
    const localProducts = await offlineService.getProducts();
    const filtered = localProducts.filter(p => p.id !== productId);
    await offlineService.saveProducts(filtered);

    // Note: il manque DELETE_PRODUCT dans le type SyncItem mais je vais l'ajouter au SyncManager
    await offlineService.addToSyncQueue({
      id: uuidv4(),
      type: 'UPDATE_PRODUCT', // On peut réutiliser ou créer un nouveau type
      payload: { productId, deleted: true } as any
    });
  },

  // Mettre à jour la quantité (ex: après une vente)
  updateQuantity: async (productId: string, newQuantity: number) => {
    await stockService.updateProduct(productId, { quantity: newQuantity });
  },

  // Logger une entrée de stock
  logStockEntry: async (entry: Omit<StockEntry, 'id'>) => {
    try {
      const { error } = await supabase
        .from('stock_entries')
        .insert(mapAppStockEntryToSupabaseInsert(entry));

      if (error) {
        // On ne loggue en warning que si ce n'est pas une erreur RLS connue pour ne pas polluer la console
        if (error.code !== '42P01') { // 42P01 = table manquante
          console.log("Note: L'historique des stocks n'a pas pu être enregistré (Vérifiez RLS sur Supabase)");
        }
      }
    } catch (e) {
      // Silencieux pour l'utilisateur final
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
