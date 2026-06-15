// Rôle utilisateur
export type UserRole = 'merchant' | 'admin';

// Statut du compte
export type AccountStatus = 'active' | 'inactive';

// Message entre admin et utilisateur
export interface Message {
  id: string;
  senderId: string;
  receiverId: string | 'all'; // 'all' = broadcast de l'admin
  content: string;
  sentAt: string;
  isRead: boolean;
  type?: 'support' | 'info' | 'reclamation';
}

// Utilisateur
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // Stocké localement pour la simulation
  role: UserRole;
  status: AccountStatus;
  subscriptionExpiry: string; // ISO date string
  debt: number; // montant dû en FCFA
  createdAt: string;
  messages: Message[];
  phone: string;
  shopName?: string;
  businessType?: string;
}

// Transaction (dépense ou vente)
export type TransactionType = 'sale' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO date string
  createdAt: string;
}

// Résumé financier
export interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  balance: number;
  periodLabel: string; // ex: "Juin 2025"
}

// Produit pour le stock
export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number; // Prix de vente
  purchasePrice: number; // Prix d'achat
  category: string;
  userId: string;
  createdAt: string;
}

// Entrée de stock (historique)
export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  purchasePrice: number;
  date: string;
  userId: string;
}

// Thème de l'application
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  danger: string;
  text: string;
  textMuted: string;
  border: string;
  card: string;
}