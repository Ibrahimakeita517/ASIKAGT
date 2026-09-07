import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Linking } from 'react-native';
import { Transaction, User } from '../models/types';
import { formatCurrency } from '../context/formatters';

export const receiptService = {
  generateHTML: (transaction: Transaction, user: User | null) => {
    const shopName = user?.shopName || 'Ma Boutique ASIKA';
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Commerçant';
    const dateStr = new Date(transaction.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isSale = transaction.type === 'sale' || transaction.type === 'debt';
    const title = isSale ? 'REÇU DE VENTE' : 'TICKET DE DÉPENSE';
    const color = isSale ? '#10B981' : '#EF4444';

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; border-bottom: 2px dashed #eee; padding-bottom: 20px; margin-bottom: 20px; }
            .shop-name { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
            .receipt-title { font-size: 18px; color: ${color}; font-weight: bold; text-transform: uppercase; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .label { color: #666; }
            .value { font-weight: 600; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { text-align: left; border-bottom: 1px solid #eee; padding: 10px 0; color: #666; }
            .items-table td { padding: 15px 0; border-bottom: 1px solid #f9f9f9; }
            .total-section { border-top: 2px solid #eee; padding-top: 15px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; }
            .asika-tag { font-weight: bold; color: #1e3a8a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${shopName}</div>
            <div class="receipt-title">${title}</div>
            <p style="margin: 5px 0; font-size: 12px; color: #888;">${userName}</p>
          </div>

          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">${dateStr}</span>
          </div>
          <div class="info-row">
            <span class="label">N° Reçu:</span>
            <span class="value">#${transaction.id.substring(0, 8).toUpperCase()}</span>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${transaction.description}</td>
                <td style="text-align: right;">${formatCurrency(transaction.amount)}</td>
              </tr>
              ${transaction.type === 'debt' ? `
                <tr>
                  <td style="color: #EF4444;">Reste à payer</td>
                  <td style="text-align: right; color: #EF4444;">${formatCurrency(transaction.remainingAmount || 0)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <span>TOTAL</span>
              <span>${formatCurrency(transaction.type === 'debt' ? (transaction.totalAmount || transaction.amount) : transaction.amount)}</span>
            </div>
            ${transaction.type === 'debt' ? `
              <div class="info-row" style="margin-top: 10px;">
                <span class="label">Client:</span>
                <span class="value">${transaction.customerName}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Merci de votre achat !</p>
            <p>Généré par <span class="asika-tag">ASIKA</span> - Votre gestion simplifiée</p>
          </div>
        </body>
      </html>
    `;
  },

  print: async (transaction: Transaction, user: User | null) => {
    const html = receiptService.generateHTML(transaction, user);
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Erreur impression:', error);
    }
  },

  shareToWhatsApp: async (transaction: Transaction, user: User | null, phoneNumber: string) => {
    const html = receiptService.generateHTML(transaction, user);

    try {
      // 1. Générer le PDF
      const { uri } = await Print.printToFileAsync({ html });

      // 2. Préparer le message WhatsApp
      const cleanPhone = phoneNumber.replace(/\s/g, '').replace('+', '');
      const message = `Bonjour, voici votre reçu de chez ${user?.shopName || 'notre boutique'}. Merci de votre confiance !`;

      if (Platform.OS === 'web') {
        // Sur le Web, on ouvre juste le lien WhatsApp avec le message
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      } else {
        // Sur mobile, on partage le fichier
        // Note: On ne peut pas envoyer un fichier DIRECTEMENT à un numéro précis via l'API WhatsApp
        // sans passer par le menu de partage natif ou l'API Business payante.
        // Mais on peut ouvrir WhatsApp.

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Envoyer le reçu via WhatsApp',
            UTI: 'com.adobe.pdf'
          });
        }
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  }
};
