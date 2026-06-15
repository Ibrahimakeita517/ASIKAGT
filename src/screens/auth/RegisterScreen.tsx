import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useNavigation } from '@react-navigation/native';

const RegisterScreen = () => {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation simple
    if (!firstName || !lastName || !phone || !email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      await signUp(firstName, lastName, email, password, phone);
      // L'utilisateur sera automatiquement connecté par le AuthContext
    } catch (error: any) {
      Alert.alert('Erreur d\'inscription', error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Rejoignez ASIKA pour gérer votre commerce
          </Text>
        </View>

        <Card style={styles.card}>
          <Input 
            label="Prénom" 
            placeholder="Ibrahima" 
            value={firstName} 
            onChangeText={setFirstName} 
          />
          <Input 
            label="Nom" 
            placeholder="Keita" 
            value={lastName} 
            onChangeText={setLastName} 
          />
          <Input 
            label="Numéro de téléphone" 
            placeholder="223 83221686" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad"
          />
          <Input 
            label="Email" 
            placeholder="exemple@email.com" 
            value={email} 
            onChangeText={setEmail} 
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input 
            label="Mot de passe" 
            placeholder="Min. 8 caractères" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
          />

          <Button 
            title="S'inscrire" 
            onPress={handleRegister} 
            loading={loading} 
            style={styles.btn} 
          />

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.footer}
          >
            <Text style={{ color: colors.textMuted }}>
              Déjà un compte ? <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 80, paddingBottom: 40 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 8 },
  card: { padding: 20 },
  btn: { marginTop: 20 },
  footer: { marginTop: 25, alignItems: 'center' }
});

export default RegisterScreen;