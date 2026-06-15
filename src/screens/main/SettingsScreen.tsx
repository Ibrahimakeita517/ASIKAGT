import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  Alert, 
  Linking,
  Modal,
  Platform
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const { user, signOut, updateProfile, updatePassword, isAdmin } = useAuth();
  const { mode, toggleTheme, colors } = useTheme();

  // États pour le profil
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [shopName, setShopName] = useState(user?.shopName || '');
  const [businessType, setBusinessType] = useState(user?.businessType || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // État pour la modale "À propos"
  const [aboutVisible, setAboutVisible] = useState(false);

  const handleUpdateProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert('Erreur', 'Les champs nom, prénom et téléphone ne peuvent pas être vides.');
      return;
    }

    if (
      firstName === user?.firstName &&
      lastName === user?.lastName &&
      phone === user?.phone &&
      shopName === user?.shopName &&
      businessType === user?.businessType
    ) {
      Alert.alert('Info', 'Aucune modification détectée.');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateProfile(firstName, lastName, phone, shopName, businessType);
      Alert.alert('Succès', 'Profil mis à jour avec succès.');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      Alert.alert('Succès', 'Mot de passe modifié avec succès.');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier le mot de passe.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Se déconnecter", style: "destructive", onPress: signOut }
      ]
    );
  };

  const openSupport = (type: 'whatsapp' | 'tel' | 'mail') => {
    const phone = "22383221696";
    const email = "support@asika.app";
    
    let url = "";
    if (type === 'whatsapp') url = `https://wa.me/${phone}?text=Bonjour ASIKA Support`;
    if (type === 'tel') url = `tel:+${phone}`;
    if (type === 'mail') url = `mailto:${email}`;
    
    Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir l'application."));
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title.toUpperCase()}</Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profil */}
        <View style={styles.profileHeader}>
          <Avatar firstName={user?.firstName || ''} lastName={user?.lastName || ''} size={80} />
          <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
          
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isAdmin ? '#F59E0B' : colors.primary }]}>
            <Text style={styles.roleText}>{isAdmin ? 'Administrateur' : 'Marchand'}</Text>
          </View>
        </View>

        {/* Section Commerce */}
        <SectionTitle title="Mon Commerce" />
        <Card>
          <Input
            label="Nom du commerce"
            value={shopName}
            onChangeText={setShopName}
            placeholder="Ex: Boutique Diallo & Frères"
          />
          <Input
            label="Type d'activité"
            value={businessType}
            onChangeText={setBusinessType}
            placeholder="Ex: Prêt-à-porter, Alimentation, etc."
          />
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 15, paddingHorizontal: 5 }}>
            Ces informations permettent à ASIKA AI de vous donner des conseils personnalisés.
          </Text>
        </Card>

        {/* Section Profil */}
        <SectionTitle title="Profil" />
        <Card>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
          <Input label="Nom" value={lastName} onChangeText={setLastName} />
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button title="Enregistrer les modifications" onPress={handleUpdateProfile} loading={isUpdatingProfile} />
        </Card>

        {/* Section Sécurité */}
        <SectionTitle title="Sécurité" />
        <Card>
          <Input label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Min. 8 caractères" />
          <Button title="Changer le mot de passe" type="outline" onPress={handleChangePassword} loading={isUpdatingPassword} />
        </Card>

        {/* Section Préférences */}
        <SectionTitle title="Préférences" />
        <Card style={styles.rowCard}>
          <View style={styles.prefRow}>
            <View style={styles.prefLabelGroup}>
              <Ionicons name="moon" size={22} color={colors.text} />
              <Text style={[styles.prefLabel, { color: colors.text }]}>Mode sombre</Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: colors.primary }} />
          </View>
        </Card>

        {/* Section Support */}
        <SectionTitle title="Support & Aide" />
        <Card style={styles.supportCard}>
          <TouchableOpacity style={styles.supportItem} onPress={() => openSupport('whatsapp')}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={[styles.supportText, { color: colors.text }]}>Contacter via WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => openSupport('tel')}>
            <Ionicons name="call" size={24} color={colors.primary} />
            <Text style={[styles.supportText, { color: colors.text }]}>Appeler l'assistance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL('https://asika.app')}>
            <Ionicons name="globe-outline" size={24} color={colors.secondary} />
            <Text style={[styles.supportText, { color: colors.text }]}>Visiter notre site web</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => setAboutVisible(true)}>
            <Ionicons name="information-circle" size={24} color={colors.textMuted} />
            <Text style={[styles.supportText, { color: colors.text }]}>À propos de ASIKA</Text>
          </TouchableOpacity>
        </Card>

        <Button title="Se déconnecter" type="danger" onPress={handleLogout} style={styles.logoutBtn} />
        
        <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0</Text>
      </ScrollView>

      {/* Modale À propos */}
      <Modal visible={aboutVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Ionicons name="storefront" size={50} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>ASIKA</Text>
            <Text style={[styles.modalVersion, { color: colors.textMuted }]}>v1.0.0</Text>
            <Text style={[styles.modalDesc, { color: colors.text }]}>
              ASIKA est votre partenaire quotidien pour la gestion de votre commerce. 
              Digitalisez vos cahiers et suivez vos profits en temps réel.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://asika.app')} style={{ marginBottom: 20 }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>www.asika.app</Text>
            </TouchableOpacity>
            <Text style={[styles.modalDev, { color: colors.textMuted }]}>Développé avec ❤️ par l'équipe ASIKA</Text>
            <Button title="Fermer" type="outline" onPress={() => setAboutVisible(false)} style={{ width: '100%' }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  userName: { fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  userEmail: { fontSize: 14, marginTop: 4 },
  qrContainer: { 
    marginTop: 20, 
    padding: 15, 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 10 },
  roleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginTop: 25, marginBottom: 10, marginLeft: 5 },
  rowCard: { paddingVertical: 10 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  prefLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  prefLabel: { fontSize: 16, marginLeft: 12 },
  supportCard: { paddingVertical: 5 },
  supportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  supportText: { fontSize: 16, marginLeft: 15 },
  logoutBtn: { marginTop: 40 },
  versionText: { textAlign: 'center', marginTop: 20, fontSize: 12 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    width: '100%', 
    borderRadius: 25, 
    padding: 30, 
    alignItems: 'center' 
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 15 },
  modalVersion: { fontSize: 14, marginBottom: 20 },
  modalDesc: { textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  modalDev: { fontSize: 12, marginBottom: 30 }
});

export default SettingsScreen;