import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../models/ThemeContext';
import { Avatar } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const { user, signOut, updateProfile, isAdmin } = useAuth();
  const { mode, toggleTheme, colors } = useTheme();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [aboutVisible, setAboutVisible] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire.');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await updateProfile(firstName, lastName, phone);
      Alert.alert('Succès', 'Profil mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', 'Echec de la mise à jour.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const openSupport = (type: 'whatsapp' | 'tel' | 'mail') => {
    const phoneNum = "22383221696";
    const email = "support@asika.app";
    let url = "";
    if (type === 'whatsapp') url = `https://wa.me/${phoneNum}?text=Bonjour ASIKA Support`;
    if (type === 'tel') url = `tel:+${phoneNum}`;
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
          <Avatar firstName={user?.firstName || 'A'} lastName={user?.lastName || 'K'} size={80} />
          <Text style={[styles.userName, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>

          {isAdmin && (
            <View style={[styles.roleBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.roleText}>ADMINISTRATEUR</Text>
            </View>
          )}
        </View>

        {/* Section Profil */}
        <SectionTitle title="Mon Profil" />
        <Card>
          <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
          <Input label="Nom" value={lastName} onChangeText={setLastName} />
          <Input label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button title="Enregistrer les modifications" onPress={handleUpdateProfile} loading={isUpdatingProfile} />
        </Card>

        {/* Section Préférences */}
        <SectionTitle title="Préférences" />
        <Card>
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
        <Card style={{ paddingVertical: 5 }}>
          <TouchableOpacity style={styles.supportItem} onPress={() => openSupport('whatsapp')}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={[styles.supportText, { color: colors.text }]}>WhatsApp Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => openSupport('tel')}>
            <Ionicons name="call" size={24} color={colors.primary} />
            <Text style={[styles.supportText, { color: colors.text }]}>Appeler l'assistance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL('https://ibrahimakeita517.github.io/ASIKAGT-site-officiel/')}>
            <Ionicons name="globe-outline" size={24} color={colors.secondary} />
            <Text style={[styles.supportText, { color: colors.text }]}>Site officiel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem} onPress={() => setAboutVisible(true)}>
            <Ionicons name="information-circle" size={24} color={colors.textMuted} />
            <Text style={[styles.supportText, { color: colors.text }]}>À propos de ASIKA</Text>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center' }}>SE DÉCONNECTER</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0</Text>
      </ScrollView>

      {/* Modale À propos */}
      <Modal visible={aboutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
              <Image source={require('../../../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 20 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>ASIKA</Text>
              <Text style={[styles.modalTagline, { color: colors.primary }]}>La révolution de la gestion commerciale</Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.founderSection}>
                <Text style={[styles.founderTitle, { color: colors.text }]}>Mot du Fondateur</Text>
                <Text style={[styles.founderName, { color: colors.primary }]}>Ibrahima Keita</Text>
                <Text style={[styles.founderVision, { color: colors.text }]}>
                  "Ma mission est de moderniser le commerce en Afrique en offrant des outils puissants et accessibles à tous les entrepreneurs."
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.modalDesc, { color: colors.text }]}>
                ASIKA est bien plus qu'une application, c'est votre partenaire de croissance au quotidien.
              </Text>

              <Button title="Fermer" type="outline" onPress={() => setAboutVisible(false)} style={{ width: '100%', marginTop: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 25 },
  userName: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  userEmail: { fontSize: 14, opacity: 0.6 },
  roleBadge: { paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 10 },
  roleText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 25, marginBottom: 10 },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  prefLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  prefLabel: { fontSize: 16, marginLeft: 12 },
  supportItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  supportText: { fontSize: 16, marginLeft: 15 },
  logoutBtn: { marginTop: 40, padding: 15 },
  versionText: { textAlign: 'center', marginTop: 20, fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 25, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  modalTagline: { fontSize: 13, textAlign: 'center', marginTop: 5 },
  divider: { height: 1, width: '100%', marginVertical: 15 },
  founderSection: { alignItems: 'center', width: '100%' },
  founderTitle: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5, opacity: 0.6 },
  founderName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  founderVision: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  modalDesc: { textAlign: 'center', fontSize: 14, lineHeight: 20 }
});

export default SettingsScreen;
