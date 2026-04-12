import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

  // 🚀 เช็คเงื่อนไขว่ากรอกครบทุกช่องและติ๊กยอมรับเงื่อนไขหรือยัง
  const isFormValid = fullName.trim() !== '' && email.trim() !== '' && phone.trim() !== '' && password.trim() !== '' && confirmPassword.trim() !== '' && agreed;

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
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
        // ดัก error กรณีมีบัญชีอยู่แล้ว
        if (errorMessage.includes('already registered')) {
          errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น';
        }
        Alert.alert('เกิดข้อผิดพลาด', errorMessage);
        return;
      }
      
      setLoading(false); 
      Alert.alert('สำเร็จ!', 'สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ');
      router.replace('/login'); 
      
    } catch (error: any) {
      setLoading(false); 
      Alert.alert('เกิดข้อผิดพลาด', error.message);
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
              <MaterialCommunityIcons name="train" size={60} color="#FFF" />
              <Text style={styles.logoText}>RailGo</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bottomCard}>
          
          <View style={styles.headerTitleRow}>
            <Text style={styles.pageTitle}>สร้างบัญชี</Text>
            <Text style={styles.pageSubtitle}>เริ่มต้นการเดินทางกับ RailGo</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อ-สกุล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="id-card-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Abasdrun" placeholderTextColor="#BDBDBD" value={fullName} onChangeText={setFullName} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>อีเมล</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="abasdrun.mae@spumail.net" placeholderTextColor="#BDBDBD" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>เบอร์โทร</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.phonePrefixBox}>
                <Text style={styles.phonePrefixText}>TH +66</Text>
              </View>
              <View style={styles.phoneInputWrapper}>
                <TextInput style={styles.phoneInput} placeholder="081-234-5678" placeholderTextColor="#BDBDBD" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                {phone.length > 0 && <View style={styles.phoneActiveDot} />}
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#BDBDBD" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#757575" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#757575" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#BDBDBD" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#757575" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
            <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
              {agreed && <Ionicons name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={styles.termsText}>ฉันยอมรับ <Text style={styles.termsLink}>ข้อกำหนดการใช้งาน</Text> และ <Text style={styles.termsLink}>นโยบายความเป็นส่วนตัว</Text></Text>
          </TouchableOpacity>

          {/* 🚀 ปุ่มจะจางลงถ้ากรอกข้อมูลไม่ครบ หรือยังไม่ติ๊กยอมรับ */}
          <TouchableOpacity 
            style={[styles.primaryBtn, (!isFormValid || loading) && {opacity: 0.5}]} 
            onPress={handleSignup} 
            disabled={!isFormValid || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>สร้างบัญชี</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={20} color="#DB4437" style={{marginRight: 10}} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={20} color="#4267B2" style={{marginRight: 10}} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>มีบัญชีพร้อมใช้แล้ว? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContainer: { flexGrow: 1 },
  // 🚀 แก้บั๊ก Scroll
  topBackground: { height: height * 0.35, backgroundColor: '#262956', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  graphicCircle1: { position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  graphicCircle2: { position: 'absolute', bottom: -100, left: -50, width: 400, height: 400, borderRadius: 200, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  logoContainer: { alignItems: 'center', marginTop: -20 },
  logoText: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  
  // 🚀 เอา flex: 1 ออก และเพิ่ม paddingBottom
  bottomCard: { minHeight: height * 0.65, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, marginTop: -30, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, paddingBottom: 50 },
  
  headerTitleRow: { marginBottom: 20 },
  pageTitle: { fontSize: 18, fontWeight: 'bold', color: '#757575' },
  pageSubtitle: { fontSize: 12, color: '#5E35B1', fontWeight: 'bold', marginTop: 2 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 8, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 15, height: 48, backgroundColor: '#FFF' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, color: '#333' },
  eyeIcon: { padding: 5 },
  phoneInputContainer: { flexDirection: 'row', height: 48, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, overflow: 'hidden' },
  phonePrefixBox: { width: 70, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E0E0E0' },
  phonePrefixText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  phoneInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#FFF' },
  phoneInput: { flex: 1, fontSize: 13, color: '#333' },
  phoneActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A7F3D0' }, 
  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 5 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#5E35B1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxActive: { backgroundColor: '#5E35B1' },
  termsText: { flex: 1, fontSize: 9, color: '#757575', lineHeight: 14 },
  termsLink: { color: '#5E35B1', fontWeight: 'bold' },
  primaryBtn: { backgroundColor: '#5E35B1', height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 15, color: '#9E9E9E', fontSize: 10 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 45, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 25, marginHorizontal: 5 },
  socialBtnText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  footerText: { fontSize: 11, color: '#757575' },
  footerLink: { fontSize: 11, color: '#5E35B1', fontWeight: 'bold' },
});