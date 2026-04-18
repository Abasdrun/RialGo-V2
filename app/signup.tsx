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

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('error');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');

  const showAlert = (type: 'success' | 'error', title: string, msg: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalMsg(msg);
    setModalVisible(true);
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('error', 'ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลในช่องที่ว่างให้ครบทุกช่อง');
      return;
    }
    if (phone.length !== 10) {
      showAlert('error', 'เบอร์โทรไม่ถูกต้อง', 'กรุณาระบุเบอร์โทรศัพท์ให้ครบ 10 หลัก');
      return;
    }
    if (!agreed) {
      showAlert('error', 'ข้อกำหนดการใช้งาน', 'กรุณากดติ๊กยอมรับข้อกำหนดก่อนสมัครสมาชิก');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('error', 'รหัสผ่านไม่ตรงกัน', 'รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: phone }
        }
      });
      
      if (error) {
        setLoading(false); 
        let errorMessage = error.message;
        if (errorMessage.includes('already registered')) {
          errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
        } else if (errorMessage.includes('Password should be at least 6 characters')) {
          errorMessage = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        }
        showAlert('error', 'สมัครสมาชิกไม่สำเร็จ', errorMessage);
        return;
      }
      
      setLoading(false); 
      showAlert('success', 'สมัครสมาชิกสำเร็จ!', 'คุณสามารถเข้าสู่ระบบเพื่อเริ่มใช้งานได้ทันที');
      setTimeout(() => {
        setModalVisible(false);
        router.replace('/login'); 
      }, 2500);
      
    } catch (error: any) {
      setLoading(false); 
      showAlert('error', 'ระบบขัดข้อง', 'ไม่สามารถเชื่อมต่อได้ในขณะนี้');
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
              <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bottomCard}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.pageTitle}>สร้างบัญชี</Text>
            <Text style={styles.pageSubtitle}>เริ่มต้นการเดินทางกับ RailGo</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ-นามสกุล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#555" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="กรุณากรอกชื่อ-นามสกุล" placeholderTextColor="#BDBDBD" value={fullName} onChangeText={setFullName} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="mail-outline" size={20} color="#555" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="example@mail.com" placeholderTextColor="#BDBDBD" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>เบอร์โทรศัพท์</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>TH +66</Text>
              </View>
              <View style={styles.phoneInputWrapper}>
                <TextInput 
                  style={styles.phoneInput} 
                  placeholder="0812345678" 
                  placeholderTextColor="#BDBDBD" 
                  keyboardType="phone-pad" 
                  value={phone} 
                  onChangeText={setPhone} 
                  maxLength={10} 
                />
                {phone.length === 10 && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key-variant" size={20} color="#555" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="อย่างน้อย 6 ตัวอักษร" placeholderTextColor="#BDBDBD" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ยืนยันรหัสผ่านอีกครั้ง</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="key-variant" size={20} color="#555" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="กรอกรหัสผ่านเดิมอีกครั้ง" placeholderTextColor="#BDBDBD" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={styles.termsText}>ฉันยอมรับ <Text style={styles.termsLink}>ข้อกำหนดการใช้งาน</Text> และ <Text style={styles.termsLink}>นโยบายความเป็นส่วนตัว</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.primaryBtn, loading && {opacity: 0.7}]} 
            onPress={handleSignup} 
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>สร้างบัญชี</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>หรือ</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={18} color="#DB4437" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={18} color="#1877F2" style={{marginRight: 8}} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>มีบัญชีผู้ใช้อยู่แล้ว? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.iconCircle, { backgroundColor: modalType === 'success' ? '#E8F5E9' : '#FFEBEE' }]}>
              <Ionicons 
                name={modalType === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={50} 
                color={modalType === 'success' ? "#4CAF50" : "#F44336"} 
              />
            </View>
            <Text style={styles.modalTitleText}>{modalTitle}</Text>
            <Text style={styles.modalMsgText}>{modalMsg}</Text>
            <TouchableOpacity 
              style={[styles.modalBtn, { backgroundColor: modalType === 'success' ? '#4CAF50' : '#2E2D77' }]} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>ตกลง</Text>
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
  topBackground: { height: height * 0.28, backgroundColor: '#2E2D77', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  graphicCircle1: { position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)' },
  graphicCircle2: { position: 'absolute', bottom: -60, left: -50, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.04)' },
  logoContainer: { alignItems: 'center' },
  // 🚀 ปรับขนาดรูปโลโก้ให้ใหญ่ขึ้น
  logoImage: { width: 180, height: 120, marginBottom: -20 },
  logoText: { color: '#FFF', fontSize: 26, fontWeight: 'bold', marginTop: 10 },
  
  bottomCard: { minHeight: height * 0.75, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, marginTop: -40, paddingBottom: 50 },
  headerTitleRow: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#444' },
  pageSubtitle: { fontSize: 13, color: '#5D5BBF', fontWeight: 'bold', marginTop: 2 },
  
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 6, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, height: 50, backgroundColor: '#FFF' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  eyeIcon: { padding: 5 },
  
  phoneInputContainer: { flexDirection: 'row', height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, overflow: 'hidden' },
  phonePrefixBox: { width: 70, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#DDD' },
  phonePrefixText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  phoneInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#FFF' },
  phoneInput: { flex: 1, fontSize: 14, color: '#333' },
  
  termsRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5D5BBF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxActive: { backgroundColor: '#5D5BBF' },
  termsText: { flex: 1, fontSize: 10, color: '#757575', lineHeight: 15 },
  termsLink: { color: '#5D5BBF', fontWeight: 'bold' },
  
  primaryBtn: { backgroundColor: '#2E2D77', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: { marginHorizontal: 15, color: '#999', fontSize: 12 },
  
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  socialBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderWidth: 1, borderColor: '#DDD', borderRadius: 25 },
  socialBtnText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 13, color: '#757575' },
  footerLink: { fontSize: 13, color: '#5D5BBF', fontWeight: 'bold', textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.85, backgroundColor: '#FFF', borderRadius: 25, padding: 30, alignItems: 'center', elevation: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitleText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalMsgText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  modalBtn: { width: '100%', height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});