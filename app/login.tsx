import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions, 
  Modal,
  Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false); 
        let errorMessage = error.message;
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ';
        }
        setModalMsg(errorMessage);
        setModalVisible(true);
        return;
      }
      
      setLoading(false); 
      router.replace('/'); 
      
    } catch (error: any) {
      setLoading(false); 
      setModalMsg(error.message || 'ไม่สามารถเชื่อมต่อระบบได้');
      setModalVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
        
        <View style={styles.topBackground}>
          <View style={styles.graphicCircle1} />
          <View style={styles.graphicCircle2} />
          <SafeAreaView edges={['top']}>
            <View style={styles.logoContainer}>
              {/* 🚀 อัปเดตเป็นชื่อโลโก้ใหม่ logo_new.png เรียบร้อยครับ */}
              <Image 
                source={require('../assets/images/logo3.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bottomCard}>
          <View style={styles.headerTextGroup}>
             <Text style={styles.pageTitle}>เข้าสู่ระบบ</Text>
             <Text style={styles.subTitle}>กลับเข้าสู่การเดินทางกับ RailGo</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="mail-outline" size={22} color="#555" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="กรุณากรอกอีเมลของคุณ" 
                placeholderTextColor="#BDBDBD" 
                keyboardType="email-address" 
                autoCapitalize="none" 
                value={email} 
                onChangeText={setEmail} 
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key-variant" size={22} color="#555" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="กรุณากรอกรหัสผ่าน" 
                placeholderTextColor="#BDBDBD" 
                secureTextEntry={!showPassword} 
                value={password} 
                onChangeText={setPassword} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={styles.rememberText}>จดจำรหัสผ่าน</Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, (!isFormValid || loading) && {opacity: 0.8}]} 
            onPress={handleLogin} 
            disabled={!isFormValid || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>เข้าสู่ระบบ</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>หรือ</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={22} color="#DB4437" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={22} color="#1877F2" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>ยังไม่มีบัญชีผู้ใช้? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}>สมัครสมาชิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="alert-circle" size={44} color="#FF5252" />
            </View>
            <Text style={styles.modalTitle}>เข้าสู่ระบบไม่สำเร็จ</Text>
            <Text style={styles.modalMessage}>{modalMsg}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>ลองใหม่อีกครั้ง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContainer: { flexGrow: 1 },
  topBackground: { height: height * 0.32, backgroundColor: '#2E2D77', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  graphicCircle1: { position: 'absolute', top: -30, right: -40, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.06)' },
  graphicCircle2: { position: 'absolute', bottom: -50, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.04)' },
  logoContainer: { alignItems: 'center' },
  // ปรับแต่งขนาดโลโก้ใหม่ให้ดูลงตัวกับ Header
  logoImage: { width: 260, height: 160, marginBottom: -30 }, 
  logoText: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 5 },
  
  bottomCard: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 25, paddingVertical: 30, marginTop: -40 },
  headerTextGroup: { marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 15 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 14, color: '#5D5BBF', marginTop: 4, fontWeight: '600' },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#444', marginBottom: 8, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, height: 55, backgroundColor: '#FAFAFA' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  eyeIcon: { padding: 5 },
  
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 5 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5D5BBF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#5D5BBF' },
  rememberText: { fontSize: 13, color: '#666' },
  forgotText: { fontSize: 13, color: '#5D5BBF', fontWeight: 'bold' },
  
  primaryBtn: { backgroundColor: '#2E2D77', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: { marginHorizontal: 15, color: '#999', fontSize: 14, fontWeight: 'bold' },
  
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  socialBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', elevation: 1 },
  socialBtnText: { fontSize: 15, fontWeight: 'bold', color: '#444' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  footerText: { fontSize: 14, color: '#666' },
  footerLink: { fontSize: 14, color: '#5D5BBF', fontWeight: 'bold', textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 25, padding: 30, alignItems: 'center', elevation: 10 },
  errorIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalMessage: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  modalButton: { backgroundColor: '#2E2D77', width: '100%', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});