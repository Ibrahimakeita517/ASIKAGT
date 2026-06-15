import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../models/ThemeContext';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { 
            backgroundColor: colors.surface, 
            color: colors.text, 
            borderColor: error ? colors.danger : colors.border 
          },
          style
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});