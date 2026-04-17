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
  Modal 
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
  const [rememberMe, setRememberMe] = useState(false); // เปลี่ยนกลับเป็นจดจำรหัสผ่าน

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
        
        {/* ส่วนหัวสีน้ำเงิน */}
        <View style={styles.topBackground}>
          <View style={styles.graphicCircle1} />
          <View style={styles.graphicCircle2} />
          <SafeAreaView edges={['top']}>
            <View style={styles.logoContainer}>
              {/* 1. แก้โลโก้กลับเป็นแบบเดิม */}
              <MaterialCommunityIcons name="train" size={70} color="#FFF" />
              <Text style={styles.logoText}>RailGo</Text>
            </View>
          </SafeAreaView>
        </View>

        {/* ส่วนฟอร์ม Login */}
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
                placeholder="abasdrun.mae@spumail.net" 
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
                placeholder="••••••••" 
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

          {/* 2. ย้ายลืมรหัสผ่านขึ้นมาใกล้ช่องกรอก และ 3. เปลี่ยนเป็นจดจำรหัสผ่าน */}
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
            style={[styles.primaryBtn, (!isFormValid || loading) && {opacity: 0.7}]} 
            onPress={handleLogin} 
            disabled={!isFormValid || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>เข้าสู่ระบบ</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={24} color="#DB4437" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.footerLink}>สมัครสมาชิก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Popup แจ้งเตือน */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconCircle}><Ionicons name="alert-circle" size={44} color="#FF5252" /></View>
            <Text style={styles.modalTitle}>เข้าสู่ระบบล้มเหลว</Text>
            <Text style={styles.modalMessage}>{modalMsg}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>ลองอีกครั้ง</Text>
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
  topBackground: { height: height * 0.35, backgroundColor: '#2E2D77', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  graphicCircle1: { position: 'absolute', top: -20, right: -40, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.05)' },
  graphicCircle2: { position: 'absolute', bottom: 40, left: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.03)' },
  logoContainer: { alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 5 },
  
  bottomCard: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 25, paddingVertical: 30, marginTop: -40 },
  headerTextGroup: { marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 15 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#444' },
  subTitle: { fontSize: 14, color: '#5D5BBF', marginTop: 4 },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, height: 55 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  eyeIcon: { padding: 5 },
  
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 5 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5D5BBF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkboxActive: { backgroundColor: '#5D5BBF' },
  rememberText: { fontSize: 12, color: '#666' },
  forgotText: { fontSize: 12, color: '#5D5BBF', fontWeight: 'bold' },
  
  primaryBtn: { backgroundColor: '#5D5BBF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { marginHorizontal: 15, color: '#333', fontSize: 14, fontWeight: 'bold' },
  
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  socialBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 30, backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  socialBtnText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  footerText: { fontSize: 14, color: '#333' },
  footerLink: { fontSize: 14, color: '#5D5BBF', fontWeight: 'bold', textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center' },
  errorIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#262956', marginBottom: 10 },
  modalMessage: { fontSize: 15, color: '#616161', textAlign: 'center', marginBottom: 30 },
  modalButton: { backgroundColor: '#262956', width: '100%', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});