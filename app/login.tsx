import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';

// 🔴 แก้ Path ให้ตรงกับที่มึงวางไฟล์ไว้ข้างนอกสุดแล้ว!
import { supabase } from '../supabase'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // เอาไว้เปิด-ปิดตา
  const [rememberMe, setRememberMe] = useState(false); // เอาไว้ติ๊กถูก Remember

  // 🧙‍♂️ ฟังก์ชันล็อกอินผ่าน Supabase
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert('เข้าสู่ระบบล้มเหลว', error.message);
    } else {
      router.replace('/'); 
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 🚂 โลโก้ RailGo (มึงเอารูปมาใส่แทน View นี้ได้เลย) */}
          <View style={styles.logoContainer}>
            <Ionicons name="train" size={60} color="#4A148C" />
            <Text style={styles.logoText}>RAILGO</Text>
          </View>

          {/* 📝 ส่วนกรอกข้อมูล */}
          <View style={styles.formSection}>
            
            {/* ช่อง Email */}
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="abasdrun.mae@spumail.net"
                placeholderTextColor="#9E9E9E"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* ช่อง Password */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#333" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#9E9E9E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword} // ซ่อน/โชว์รหัสตาม state
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#333" />
              </TouchableOpacity>
            </View>

            {/* ตัวเลือก Remember & Forgot Password */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.rememberBtn} onPress={() => setRememberMe(!rememberMe)}>
                <Ionicons name={rememberMe ? "checkbox" : "square-outline"} size={20} color={rememberMe ? "#5E35B1" : "#757575"} />
                <Text style={styles.rememberText}>Remember</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotPasswordText}>Forget your password?</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* 🔘 ปุ่ม Log In หลัก */}
          <TouchableOpacity 
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Log In'}</Text>
          </TouchableOpacity>

          {/* ➖ เส้นคั่น OR ➖ */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 🌐 ปุ่ม Social Login */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={20} color="#4267B2" />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* ลิงก์ไปหน้า Sign Up */}
          <View style={styles.signupLinkContainer}>
            <Text style={styles.noAccountText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupTabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// 📐 แกะ Style จากภาพเป๊ะๆ ขาว คลีน มินิมอล
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, // พื้นหลังสีขาวอมเทานิดๆ
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 40, paddingBottom: 30 },
  
  logoContainer: { alignItems: 'center', marginBottom: 50, flexDirection: 'row', justifyContent: 'center' },
  logoText: { fontSize: 32, fontWeight: '900', color: '#4A148C', marginLeft: 10 },
  
  formSection: { marginBottom: 30 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 15, height: 55, marginBottom: 20, borderWidth: 1, borderColor: '#BDBDBD' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333' },
  
  optionsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -5 },
  rememberBtn: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { marginLeft: 5, color: '#757575', fontSize: 14 },
  forgotPasswordText: { color: '#5E35B1', fontSize: 14, fontWeight: '600' },
  
  loginBtn: { width: '100%', height: 55, backgroundColor: '#5E35B1', borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#5E35B1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  loginBtnDisabled: { backgroundColor: '#9E9E9E' },
  loginBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#BDBDBD' },
  dividerText: { marginHorizontal: 15, color: '#757575', fontSize: 14 },
  
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  socialBtn: { flexDirection: 'row', flex: 1, backgroundColor: '#FFF', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BDBDBD', marginHorizontal: 5 },
  socialBtnText: { marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  signupLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  noAccountText: { color: '#757575', fontSize: 14 },
  signupTabText: { color: '#5E35B1', fontSize: 14, fontWeight: 'bold' },
});