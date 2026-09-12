import { apiFetch } from './supabase';
import { offlineService, SyncItem } from './offlineService';

export const SyncManager = {
  isSyncing: false,

  sync: async (userId: string) => {
    if (SyncManager.isSyncing || !userId) return;

    const queue = await offlineService.getSyncQueue(userId);
    if (queue.length === 0) return;

    SyncManager.isSyncing = true;
    console.log(`[Sync] Synchronisation Laragon en cours : ${queue.length} éléments.`);

    for (const item of queue) {
      try {
        console.log(`[Sync] Traitement de : ${item.type}`);

        const { error } = await apiFetch('sync_handle.php', {
          method: 'POST',
          body: JSON.stringify({
            type: item.type,
            payload: item.payload
          })
        });

        if (error) {
          console.error(`[Sync] Erreur sur ${item.type}:`, error);
          // On arrête la boucle si c'est un problème de connexion
          if (error.includes('Timeout') || error.includes('réseau') || error.includes('Failed to fetch')) {
            break;
          }
          // Pour les autres erreurs (ex: SQL), on passe à la suite pour ne pas bloquer la file
          continue;
        }

        await offlineService.removeFromSyncQueue(userId, item.id);
      } catch (err) {
        console.error(`[Sync] Erreur fatale:`, err);
        break;
      }
    }

    SyncManager.isSyncing = false;
  }
};
