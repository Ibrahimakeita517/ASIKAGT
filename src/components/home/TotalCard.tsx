import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { formatCurrency } from '../../context/formatters';
import { Card } from '../common/Card';

interface TotalCardProps {
  balance: number;
  sales: number;
  expenses: number;
}

export const TotalCard: React.FC<TotalCardProps> = ({ balance, sales, expenses }) => {
  const { colors } = useTheme();

  return (
    <Card style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Solde Net</Text>
      <Text style={[styles.balance, { color: colors.text }]}>{formatCurrency(balance)}</Text>
      
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>Ventes</Text>
          <Text style={[styles.amount, { color: colors.secondary }]}>+ {formatCurrency(sales)}</Text>
        </View>
        <View style={styles.column}>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>Dépenses</Text>
          <Text style={[styles.amount, { color: colors.danger }]}>- {formatCurrency(expenses)}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { marginHorizontal: 20, marginTop: 10 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 5 },
  balance: { fontSize: 28, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 1 },
  subLabel: { fontSize: 12, marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: '600' },
});