import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { isValidEmail, isNotEmpty } from '../../context/validators';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // Ajout de l'état pour le numéro de téléphone
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let newErrors: any = {};
    if (!isValidEmail(email)) newErrors.email = 'Email invalide';
    if (password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (!isLogin) {
      if (!isNotEmpty(firstName)) newErrors.firstName = 'Prénom requis';
      if (!isNotEmpty(lastName)) newErrors.lastName = 'Nom requis';
      if (!isNotEmpty(phone)) newErrors.phone = 'Numéro de téléphone requis'; // Validation du téléphone
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (isLogin) {
        await signIn(cleanEmail, password);
      } else {
        await signUp(firstName.trim(), lastName.trim(), cleanEmail, password, phone.trim());
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
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
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="storefront" size={40} color="#FFF" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>ASIKA</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isLogin ? 'Gérez votre commerce en toute simplicité' : 'Créez votre compte marchand'}
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
          {!isLogin && (
            <>
              <Input 
                label="Prénom" 
                value={firstName} 
                onChangeText={setFirstName} 
                error={errors.firstName}
                placeholder="Jean"
              />
              <Input 
                label="Nom" 
                value={lastName} 
                onChangeText={setLastName} 
                error={errors.lastName}
                placeholder="Dupont"
              />
              <Input 
                label="Numéro de téléphone" 
                value={phone} 
                onChangeText={setPhone} 
                keyboardType="phone-pad" // Clavier numérique pour le téléphone
                error={errors.phone}
                placeholder="Ex: 223 83221686"
              />
            </>
          )}
          <Input 
            label="Email" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none"
            error={errors.email}
            placeholder="exemple@asika.app"
          />
          <Input 
            label="Mot de passe" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry 
            error={errors.password}
            placeholder="********"
          />

          <Button 
            title={isLogin ? 'Se connecter' : 'Créer mon compte'} 
            onPress={handleSubmit} 
            loading={loading}
          />

          <TouchableOpacity 
            onPress={() => setIsLogin(!isLogin)} 
            style={styles.toggleButton}
          >
            <Text style={{ color: colors.textMuted }}>
              {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {isLogin ? "S'inscrire" : "Se connecter"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, justifyContent: 'center', minHeight: '100%' },
  header: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  formCard: {
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  toggleButton: { marginTop: 20, alignItems: 'center' },
});

export default LoginScreen;