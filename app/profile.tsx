import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // ข้อมูลตามตาราง profiles ของพี่ยอน
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  // 📥 1. ดึงข้อมูลโปรไฟล์จาก Database
  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบผู้ใช้งาน');

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone_number, id_card_number, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setPhoneNumber(data.phone_number || '');
        setIdCardNumber(data.id_card_number || '');
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error: any) {
      console.log('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 📸 2. ฟังก์ชันเลือกรูปและอัปโหลดเข้า Supabase Storage
  const handlePickImage = async () => {
    // ขอสิทธิ์เข้าถึงคลังรูปภาพ
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'ต้องอนุญาตให้แอปเข้าถึงรูปภาพก่อนนะครับ!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5, // ลดขนาดไฟล์หน่อยจะได้อัปลื่นๆ
      base64: true, // สำคัญ! ต้องเอา base64 ไปอัปโหลด
    });

    if (!result.canceled && result.assets[0].base64) {
      uploadAvatar(result.assets[0].base64);
    }
  };

  const uploadAvatar = async (base64Str: string) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const filePath = `${user.id}/${new Date().getTime()}.jpg`;

      // อัปโหลดเข้า Bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64Str), { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // เอาลิงก์รูปที่อัปเสร็จมาโชว์
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      
      Alert.alert('สำเร็จ', 'อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว!');
    } catch (error: any) {
      Alert.alert('อัปโหลดล้มเหลว', error.message);
    } finally {
      setSaving(false);
    }
  };

  // 💾 3. ฟังก์ชันบันทึกข้อมูลส่วนตัว (Upsert ลงตาราง profiles)
  // ✅ แก้ไข: เอา updated_at ออกแล้ว เพื่อให้ตรงกับโครงสร้างตาราง profiles ของมึง
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ไม่พบผู้ใช้งาน');

      const updates = {
        id: user.id,
        full_name: fullName,
        phone_number: phoneNumber,
        id_card_number: idCardNumber,
        avatar_url: avatarUrl,
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      // 📌 แทรกโค้ดยิงแจ้งเตือนตรงนี้ (หลัง upsert profiles)
      await supabase.from('notifications').insert([{
          user_id: user.id,
          title: 'อัปเดตโปรไฟล์สำเร็จ',
          message: 'ข้อมูลส่วนตัวของคุณได้รับการอัปเดตเรียบร้อยแล้ว',
          type: 'success'
      }]);
      // 📌 จบการแทรกโค้ด

      Alert.alert('สำเร็จ', 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้วครับ! 🎉');
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setSaving(false);
    }
  };

  // 🚪 4. ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ออกจากระบบ', 
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        }
      }
    ]);
  };

  if (loading) {
    return <View style={styles.loadingArea}><ActivityIndicator size="large" color="#5E35B1" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* 🔝 Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Ionicons name="person-outline" size={20} color="#333" />
            <Text style={styles.titleText}>My Profile</Text>
          </View>
          <View style={{width: 40}} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 📸 ส่วนอัปโหลดรูปโปรไฟล์ */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={50} color="#BDBDBD" />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage} disabled={saving}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userEmailText}>{fullName || 'พี่ยอน'}</Text>
          </View>

          {/* 📝 ฟอร์มข้อมูลส่วนตัว */}
          <View style={styles.formSection}>
            
            <Text style={styles.inputLabel}>ชื่อ-นามสกุล (Full Name)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#5E35B1" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="กรอกชื่อ-นามสกุล"
                placeholderTextColor="#9E9E9E"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <Text style={styles.inputLabel}>เบอร์โทรศัพท์ (Phone Number)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#5E35B1" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="08X-XXX-XXXX"
                placeholderTextColor="#9E9E9E"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.inputLabel}>เลขบัตรประชาชน (ID Card Number)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color="#5E35B1" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="X-XXXX-XXXXX-XX-X"
                placeholderTextColor="#9E9E9E"
                value={idCardNumber}
                onChangeText={setIdCardNumber}
                keyboardType="number-pad"
                maxLength={13}
              />
            </View>

          </View>

          {/* 🔘 ปุ่ม Action */}
          <TouchableOpacity 
            style={[styles.saveBtn, saving && {backgroundColor: '#B39DDB'}]} 
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#E91E63" />
            <Text style={styles.logoutBtnText}>ออกจากระบบ</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

  avatarSection: { alignItems: 'center', marginVertical: 30 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#5E35B1' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#BDBDBD' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#5E35B1', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FAFAFA', elevation: 4 },
  userEmailText: { marginTop: 15, fontSize: 20, fontWeight: 'bold', color: '#333' },

  formSection: { marginBottom: 30 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#757575', marginBottom: 8, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 15, height: 55, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', elevation: 1 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333' },

  saveBtn: { width: '100%', height: 55, backgroundColor: '#5E35B1', borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 3, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  logoutBtn: { flexDirection: 'row', width: '100%', height: 55, backgroundColor: '#FFF', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E91E63' },
  logoutBtnText: { color: '#E91E63', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});