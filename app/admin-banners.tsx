import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';

// 📌 ชื่อเรียกให้แอดมินเข้าใจง่าย
const slotLabels: Record<string, string> = {
  slider_1: 'สไลเดอร์รูปที่ 1 (บนสุด)',
  slider_2: 'สไลเดอร์รูปที่ 2 (บนสุด)',
  slider_3: 'สไลเดอร์รูปที่ 3 (บนสุด)',
  grid_left_top: 'รูปกริด ซ้าย-บน',
  grid_left_bottom: 'รูปกริด ซ้าย-ล่าง',
  grid_right: 'รูปกริด ขวา (แนวตั้ง)'
};

export default function AdminBannersScreen() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  const fetchBanners = async () => {
    setLoading(true);
    const { data } = await supabase.from('banners').select('*');
    if (data) setBanners(data);
    setLoading(false);
  };

  // 📸 ฟังก์ชันเปลี่ยนรูปลงเฉพาะ Slot นั้นๆ
  const handleChangeImage = async (slotName: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตให้แอปเข้าถึงรูปภาพครับ');
      return;
    }

    // กำหนดสัดส่วนรูปตาม Slot
    let aspect: [number, number] = [16, 9];
    if (slotName === 'grid_left_bottom') aspect = [16, 8];
    if (slotName === 'grid_right') aspect = [9, 16]; // รูปขวาต้องเป็นแนวตั้งสูงๆ

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspect, 
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      uploadAndReplaceImage(slotName, result.assets[0].base64);
    }
  };

  const uploadAndReplaceImage = async (slotName: string, base64Str: string) => {
    try {
      setUploadingSlot(slotName);
      const fileName = `${slotName}_${new Date().getTime()}.jpg`;
      
      // 1. อัปโหลดขึ้น Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars') // ใช้ bucket avatars ตามเดิมไปก่อน
        .upload(`banners/${fileName}`, decode(base64Str), { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. เอาลิงก์มาอัปเดตลงตาราง
      const { data } = supabase.storage.from('avatars').getPublicUrl(`banners/${fileName}`);

      const { error: dbError } = await supabase.from('banners')
        .update({ image_url: data.publicUrl })
        .eq('slot_name', slotName);

      if (dbError) throw dbError;

      Alert.alert('สำเร็จ', `อัปเดต ${slotLabels[slotName]} เรียบร้อยแล้ว!`);
      fetchBanners();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setUploadingSlot(null);
    }
  };

  // ดึงรูปมาแมปตามตำแหน่ง
  const getImageUrl = (slotName: string) => {
    const b = banners.find(item => item.slot_name === slotName);
    return b ? b.image_url : 'https://via.placeholder.com/400x200';
  };

  const renderSlotCard = (slotName: string) => (
    <View key={slotName} style={styles.bannerCard}>
      <Image source={{ uri: getImageUrl(slotName) }} style={[styles.bannerImage, slotName === 'grid_right' && {height: 250}]} />
      <View style={styles.bannerActions}>
        <Text style={styles.slotTitle}>{slotLabels[slotName]}</Text>
        <TouchableOpacity 
          style={styles.changeBtn} 
          onPress={() => handleChangeImage(slotName)}
          disabled={uploadingSlot === slotName}
        >
          {uploadingSlot === slotName ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.changeText}>เปลี่ยนรูป</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการรูปหน้าโฮม</Text>
        <View style={{width: 40}} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{marginTop: 50}} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderSlotCard('slider_1')}
          {renderSlotCard('slider_2')}
          {renderSlotCard('slider_3')}
          {renderSlotCard('grid_left_top')}
          {renderSlotCard('grid_left_bottom')}
          {renderSlotCard('grid_right')}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1E36' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  
  bannerCard: { backgroundColor: '#2A2C49', borderRadius: 20, overflow: 'hidden', marginBottom: 20, elevation: 3 },
  bannerImage: { width: '100%', height: 160, backgroundColor: '#13142B' },
  bannerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  slotTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  changeBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  changeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});