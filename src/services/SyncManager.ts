import { supabase } from './supabase';
import { offlineService, SyncItem } from './offlineService';
import { mapAppProductToSupabaseInsert } from '../utils/supabaseMappers';
import { v4 as uuidv4 } from 'uuid';

export const SyncManager = {
  isSyncing: false,

  sync: async () => {
    if (SyncManager.isSyncing) return;

    const queue = await offlineService.getSyncQueue();
    if (queue.length === 0) return;

    SyncManager.isSyncing = true;
    console.log(`Synchronisation en cours : ${queue.length} éléments.`);

    for (const item of queue) {
      try {
        await SyncManager.processItem(item);
        await offlineService.removeFromSyncQueue(item.id);
      } catch (error) {
        console.error(`Erreur synchro item ${item.id}:`, error);
        break; // Arrêt temporaire si erreur réseau
      }
    }

    SyncManager.isSyncing = false;
  },

  processItem: async (item: SyncItem) => {
    switch (item.type) {
      case 'ADD_TRANSACTION':
        const t = item.payload;
        // Upsert pour idempotence totale via UUID
        const { error: tErr } = await supabase.from('transactions').upsert({
          id: t.id,
          user_id: t.userId,
          created_by_id: t.createdById,
          created_by_name: t.createdByName,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: t.date,
          created_at: t.createdAt,
          customer_name: t.customerName,
          customer_phone: t.customerPhone,
          total_amount: t.totalAmount,
          remaining_amount: t.remainingAmount,
          status: t.status,
        }, { onConflict: 'id' });

        if (tErr) throw tErr;
        break;

      case 'DECREMENT_STOCK':
        const { productId, quantity } = item.payload;
        // Utilisation du RPC pour une décrémentation relative et atomique
        const { error: sErr } = await supabase.rpc('decrement_product_stock', {
          product_id: productId,
          qty_to_subtract: quantity
        });
        if (sErr) throw sErr;
        break;

      case 'ADD_PRODUCT':
        const { error: pErr } = await supabase.from('products').upsert(mapAppProductToSupabaseInsert(item.payload), { onConflict: 'id' });
        if (pErr) throw pErr;
        break;

      case 'UPDATE_DEBT':
        const { transactionId, paidAmount } = item.payload;
        // Pour les dettes, on utilise une transaction RPC ou un update direct sécurisé
        const { data: current } = await supabase.from('transactions').select('amount, remaining_amount').eq('id', transactionId).single();
        if (current) {
          const newRemaining = current.remaining_amount - paidAmount;
          const { error: dErr } = await supabase.from('transactions').update({
            remaining_amount: newRemaining > 0 ? newRemaining : 0,
            amount: current.amount + paidAmount,
            status: newRemaining <= 0 ? 'paid' : 'partially_paid'
          }).eq('id', transactionId);
          if (dErr) throw dErr;
        }
        break;

      case 'DELETE_TRANSACTION':
        const { error: delErr } = await supabase.from('transactions').delete().eq('id', item.payload.transactionId);
        if (delErr) throw delErr;
        break;

      case 'UPDATE_PRODUCT':
        if (item.payload.deleted) {
          const { error: pdErr } = await supabase.from('products').delete().eq('id', item.payload.productId);
          if (pdErr) throw pdErr;
        } else {
          const { error: puErr } = await supabase.from('products').update(mapAppProductToSupabaseInsert(item.payload.updates)).eq('id', item.payload.productId);
          if (puErr) throw puErr;
        }
        break;
    }
  }
};
