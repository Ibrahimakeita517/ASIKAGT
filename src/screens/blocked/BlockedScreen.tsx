import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';

const BlockedScreen = () => {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();

  const isExpired = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry) < new Date() : false;
  const isInactive = user?.status === 'inactive';

  // Numéro de l'administrateur
  const adminPhone = "+22383221696";

  const handleCall = () => {
    Linking.openURL(`tel:${adminPhone}`).catch(() => {
      Alert.alert("Erreur", "Impossible de passer l'appel.");
    });
  };

  const handleWhatsApp = () => {
    const message = isExpired
      ? `Bonjour, mon abonnement ASIKA a expiré (${user?.email}). Je souhaite le renouveler.`
      : `Bonjour, mon compte ASIKA est suspendu (${user?.email}). J'aimerais savoir pourquoi.`;
    Linking.openURL(`whatsapp://send?phone=${adminPhone}&text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert("Erreur", "WhatsApp n'est pas installé.");
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isExpired ? '#F59E0B20' : colors.danger + '20' }]}>
          <Ionicons
            name={isExpired ? "hourglass-outline" : "lock-closed"}
            size={80}
            color={isExpired ? '#F59E0B' : colors.danger}
          />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {isExpired ? "Abonnement Terminé" : "Compte Suspendu"}
        </Text>
        
        <Text style={[styles.message, { color: colors.textMuted }]}>
          {isExpired
            ? "Votre période d'essai ou votre abonnement a pris fin. Pour continuer à gérer votre commerce, veuillez renouveler votre accès."
            : "Votre compte a été désactivé par l'administrateur. Veuillez nous contacter pour régulariser votre situation."}
        </Text>

        <TouchableOpacity style={styles.phoneContainer} onPress={handleCall}>
          <Ionicons name="call" size={20} color={colors.primary} />
          <Text style={[styles.phoneText, { color: colors.primary }]}>{adminPhone}</Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button 
            title={isExpired ? "Renouveler mon accès" : "Contacter le support"}
            onPress={handleWhatsApp}
            style={styles.button}
          />
          
          <Button 
            title="Se déconnecter" 
            type="outline" 
            onPress={signOut} 
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    width: '100%',
    marginVertical: 8,
  },
});

export default BlockedScreen;