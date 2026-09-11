import { Product, StockEntry } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../services/supabase';
import {
  mapSupabaseProductToAppProduct,
  mapAppStockEntryToSupabaseInsert,
  mapSupabaseStockEntryToAppStockEntry
} from '../utils/supabaseMappers';
import { offlineService } from '../services/offlineService';

export const stockService = {
  // Récupérer tous les produits du marchand
  getProducts: async (userId: string): Promise<Product[]> => {
    if (!userId) return [];

    // 1. Retourner IMMÉDIATEMENT les produits locaux de CET utilisateur
    const localProducts = await offlineService.getProducts(userId);

    // 2. Lancer la mise à jour réseau en tâche de fond
    (async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });

        if (!error && data) {
          const remoteProducts = data.map(mapSupabaseProductToAppProduct);

          // FUSION INTELLIGENTE :
          // On garde les produits locaux qui sont en attente de synchro et pas encore sur le serveur
          const queue = await offlineService.getSyncQueue(userId);
          const pendingIds = queue.map(q => q.payload?.id || q.payload?.productId);

          const localPending = localProducts.filter(lp => pendingIds.includes(lp.id) && !remoteProducts.find(rp => rp.id === lp.id));
          const finalProducts = [...localPending, ...remoteProducts];

          await offlineService.saveProducts(userId, finalProducts);
        }
      } catch (e) {}
    })();

    return localProducts;
  },

  // Ajouter un nouveau produit
  addProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const userId = product.userId;
    const newProduct: Product = {
      ...product,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };

    // 1. Sauvegarde locale isolée
    const localProducts = await offlineService.getProducts(userId);
    await offlineService.saveProducts(userId, [...localProducts, newProduct]);

    // 2. Ajout à la file de synchronisation de CET utilisateur
    await offlineService.addToSyncQueue(userId, {
      id: newProduct.id,
      type: 'ADD_PRODUCT',
      payload: newProduct
    });

    // 3. Lancement immédiat de la synchro spécifique
    import('../services/SyncManager').then(({ SyncManager }) => {
      SyncManager.sync(userId);
    }).catch(err => console.log("Erreur synchro:", err));

    return newProduct;
  },

  // Mettre à jour un produit
  updateProduct: async (productId: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>, userId: string) => {
    const localProducts = await offlineService.getProducts(userId);
    const index = localProducts.findIndex(p => p.id === productId);

    if (index !== -1) {
      const updatedProduct = { ...localProducts[index], ...updates };
      localProducts[index] = updatedProduct;
      await offlineService.saveProducts(userId, localProducts);

      await offlineService.addToSyncQueue(userId, {
        id: uuidv4(),
        type: 'UPDATE_PRODUCT',
        payload: { productId, updates }
      });

      // Lancement immédiat de la synchro
      import('../services/SyncManager').then(({ SyncManager }) => {
        SyncManager.sync(userId);
      }).catch(err => console.log("Erreur synchro:", err));
    }
  },

  // Supprimer un produit
  deleteProduct: async (productId: string, userId: string) => {
    const localProducts = await offlineService.getProducts(userId);
    const filtered = localProducts.filter(p => p.id !== productId);
    await offlineService.saveProducts(userId, filtered);

    await offlineService.addToSyncQueue(userId, {
      id: uuidv4(),
      type: 'UPDATE_PRODUCT',
      payload: { productId, deleted: true } as any
    });

    // Lancement immédiat de la synchro
    import('../services/SyncManager').then(({ SyncManager }) => {
      SyncManager.sync(userId);
    }).catch(err => console.log("Erreur synchro:", err));
  },

  // Mettre à jour la quantité localement uniquement (pour la réactivité UI)
  updateQuantity: async (productId: string, newQuantity: number, userId: string) => {
    const localProducts = await offlineService.getProducts(userId);
    const index = localProducts.findIndex(p => p.id === productId);

    if (index !== -1) {
      localProducts[index].quantity = newQuantity;
      await offlineService.saveProducts(userId, localProducts);
    }
  },

  // Logger une entrée de stock
  logStockEntry: async (entry: Omit<StockEntry, 'id'>) => {
    try {
      const { error } = await supabase
        .from('stock_entries')
        .insert(mapAppStockEntryToSupabaseInsert(entry));

      if (error) {
        if (error.code !== '42P01') {
          console.log("Note: L'historique des stocks n'a pas pu être enregistré");
        }
      }
    } catch (e) {}
  },

  // Récupérer l'historique des entrées
  getStockEntries: async (userId: string): Promise<StockEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) return [];
      return (data || []).map(mapSupabaseStockEntryToAppStockEntry);
    } catch (e) {
      return [];
    }
  }
};
