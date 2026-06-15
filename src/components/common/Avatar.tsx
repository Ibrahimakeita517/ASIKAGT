import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../models/ThemeContext';
import { getInitials } from '../../context/formatters';

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ firstName, lastName, size = 60 }) => {
  const { colors } = useTheme();
  const initials = getInitials(firstName, lastName);

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: colors.primary + '20' 
        }
      ]}
    >
      <Text style={[styles.text, { color: colors.primary, fontSize: size * 0.4 }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: 'bold' },
});