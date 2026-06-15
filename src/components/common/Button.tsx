import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../models/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, type = 'primary', loading, disabled, style }) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    if (type === 'outline') return { borderColor: colors.primary, borderWidth: 1 };
    if (type === 'secondary') return { backgroundColor: colors.secondary };
    if (type === 'danger') return { backgroundColor: colors.danger };
    return { backgroundColor: colors.primary };
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), disabled && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={type === 'outline' ? colors.primary : '#FFF'} />
      ) : (
        <Text style={[styles.text, { color: type === 'outline' ? colors.primary : '#FFF' }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});