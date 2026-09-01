import { User, Transaction, Product, StockEntry } from '../models/types';

// Mapper pour convertir les données utilisateur de Supabase (snake_case) vers notre type User (camelCase)
export const mapSupabaseUserToAppUser = (supabaseUser: any): User => {
  if (!supabaseUser) {
    return {
      id: '',
      firstName: 'Utilisateur',
      lastName: 'Inconnu',
      email: '',
      password: '',
      role: 'proprietaire',
      status: 'inactive',
      isPremium: false,
      subscriptionExpiry: new Date().toISOString(),
      debt: 0,
      createdAt: new Date().toISOString(),
      messages: [],
      phone: '',
    };
  }

  return {
    id: supabaseUser.id || '',
    firstName: supabaseUser.first_name || 'Sans',
    lastName: supabaseUser.last_name || 'Nom',
    email: supabaseUser.email || '',
    password: '',
    role: supabaseUser.role || 'proprietaire',
    status: supabaseUser.status || 'inactive',
    isPremium: supabaseUser.is_premium || false,
    subscriptionExpiry: supabaseUser.subscription_expiry || new Date().toISOString(),
    debt: supabaseUser.debt || 0,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    messages: supabaseUser.messages || [],
    phone: supabaseUser.phone || '',
  };
};

// Mapper pour convertir notre type User (camelCase) vers les données Supabase (snake_case) pour l'insertion/mise à jour
export const mapAppUserToSupabaseInsert = (appUser: User) => {
  return {
    id: appUser.id,
    first_name: appUser.firstName,
    last_name: appUser.lastName,
    email: appUser.email,
    role: appUser.role,
    status: appUser.status,
    is_premium: appUser.isPremium,
    subscription_expiry: appUser.subscriptionExpiry,
    debt: appUser.debt,
    created_at: appUser.createdAt,
    messages: appUser.messages,
    phone: appUser.phone,
  };
};

// Mapper pour convertir les données de transaction de Supabase (snake_case) vers notre type Transaction (camelCase)
export const mapSupabaseTransactionToAppTransaction = (supabaseTransaction: any): Transaction => {
  return {
    id: supabaseTransaction.id,
    userId: supabaseTransaction.user_id,
    createdById: supabaseTransaction.created_by_id,
    createdByName: supabaseTransaction.created_by_name,
    type: supabaseTransaction.type,
    amount: supabaseTransaction.amount,
    description: supabaseTransaction.description,
    category: supabaseTransaction.category,
    date: supabaseTransaction.date,
    createdAt: supabaseTransaction.created_at,
    customerName: supabaseTransaction.customer_name,
    customerPhone: supabaseTransaction.customer_phone,
    totalAmount: supabaseTransaction.total_amount,
    remainingAmount: supabaseTransaction.remaining_amount,
    status: supabaseTransaction.status,
  };
};

// Mapper pour convertir notre type Transaction (camelCase) vers les données Supabase (snake_case)
export const mapAppTransactionToSupabaseInsert = (t: Transaction) => {
  return {
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
  };
};

// Mapper pour convertir les données de produit de Supabase (snake_case) vers notre type Product (camelCase)
export const mapSupabaseProductToAppProduct = (supabaseProduct: any): Product => {
  return {
    id: supabaseProduct.id,
    userId: supabaseProduct.user_id,
    name: supabaseProduct.name,
    quantity: supabaseProduct.quantity,
    price: supabaseProduct.price,
    purchasePrice: supabaseProduct.purchase_price || 0,
    category: supabaseProduct.category,
    createdAt: supabaseProduct.created_at,
  };
};

// Mapper pour les messages
export const mapSupabaseMessageToAppMessage = (m: any): Message => {
  return {
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    sentAt: m.sent_at,
    isRead: m.is_read,
    type: m.type
  };
};

// Mapper pour convertir notre type Product (camelCase) vers les données Supabase (snake_case)
export const mapAppProductToSupabaseInsert = (appProduct: any) => {
  const data: any = {};
  if (appProduct.userId) data.user_id = appProduct.userId;
  if (appProduct.name) data.name = appProduct.name;
  if (appProduct.quantity !== undefined) data.quantity = appProduct.quantity;
  if (appProduct.price !== undefined) data.price = appProduct.price;
  if (appProduct.purchasePrice !== undefined) data.purchase_price = appProduct.purchasePrice;
  if (appProduct.category) data.category = appProduct.category;
  return data;
};

// Mapper pour convertir les données d'entrée de stock de Supabase vers notre type StockEntry
export const mapSupabaseStockEntryToAppStockEntry = (data: any): StockEntry => {
  return {
    id: data.id,
    productId: data.product_id,
    productName: data.product_name,
    quantityAdded: data.quantity_added,
    purchasePrice: data.purchase_price,
    date: data.date,
    userId: data.user_id
  };
};

// Mapper pour convertir notre type StockEntry vers les données Supabase
export const mapAppStockEntryToSupabaseInsert = (entry: Omit<StockEntry, 'id'>) => {
  return {
    product_id: entry.productId,
    product_name: entry.productName,
    quantity_added: entry.quantityAdded,
    purchase_price: entry.purchasePrice,
    date: entry.date,
    user_id: entry.userId
  };
};