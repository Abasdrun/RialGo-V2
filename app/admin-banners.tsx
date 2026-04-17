import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';

// 📌 กำหนด 6 ช่องตายตัวของระบบ
const FIXED_SLOTS = [
  { id: 'slider_1', name: 'สไลเดอร์ 1 (บนสุด)' },
  { id: 'slider_2', name: 'สไลเดอร์ 2 (ตรงกลาง)' },
  { id: 'slider_3', name: 'สไลเดอร์ 3 (ล่างสุด)' },
  { id: 'grid_left_top', name: 'รูปกริด ซ้าย-บน' },
  { id: 'grid_left_bottom', name: 'รูปกริด ซ้าย-ล่าง' },
  { id: 'grid_right', name: 'รูปกริด ขวา (แนวตั้ง)' },
];

export default function AdminBannersScreen() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 States สำหรับ Modal อัปโหลด/แก้ไข
  const [isModalVisible, setModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<any>(null); // จำว่ากำลังแก้ช่องไหน
  const [editingId, setEditingId] = useState<number | null>(null); // จำ ID ในฐานข้อมูล (ถ้ามี)
  const [uploading, setUploading] = useState(false);

  // ข้อมูลในฟอร์ม
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // จัดการรูปภาพ
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('banners').select('*');
    if (error) console.log(error);
    if (data) setBanners(data);
    setLoading(false);
  };

  // 📸 เปิดอัลบั้มเลือกรูป
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('แจ้งเตือน', 'กรุณาอนุญาตให้แอปเข้าถึงรูปภาพครับ');
      return;
    }

    // กำหนดสัดส่วนตาม Slot
    let aspect: [number, number] = [16, 9];
    if (activeSlot?.id === 'grid_left_bottom') aspect = [16, 8];
    if (activeSlot?.id === 'grid_right') aspect = [9, 16];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspect, 
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPreviewImage(result.assets[0].uri);
      setBase64Image(result.assets[0].base64);
    }
  };

  // 💾 บันทึกข้อมูลเฉพาะ Slot นั้นๆ
  const handleSaveBanner = async () => {
    if (!title) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อแบนเนอร์');
      return;
    }
    if (!editingId && !base64Image) {
      Alert.alert('แจ้งเตือน', 'กรุณาอัปโหลดรูปภาพ');
      return;
    }

    try {
      setUploading(true);
      let finalImageUrl = previewImage; 

      // อัปโหลดรูปใหม่
      if (base64Image) {
        const fileName = `${activeSlot.id}_${new Date().getTime()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars') 
          .upload(`banners/${fileName}`, decode(base64Image), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(`banners/${fileName}`);
        finalImageUrl = data.publicUrl;
      }

      // เตรียมข้อมูลยัดลงตาราง
      const payload = {
        slot_name: activeSlot.id,
        title: title,
        image_url: finalImageUrl,
        link_url: linkUrl,
        is_active: isActive
      };

      if (editingId) {
        // อัปเดตช่องเดิมที่มีอยู่แล้ว
        const { error } = await supabase.from('banners').update(payload).eq('id', editingId);
        if (error) throw error;
        Alert.alert('สำเร็จ', `อัปเดต ${activeSlot.name} เรียบร้อย!`);
      } else {
        // สร้างข้อมูลใหม่สำหรับช่องนี้
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
        Alert.alert('สำเร็จ', `อัปโหลด ${activeSlot.name} เรียบร้อย!`);
      }

      closeModal();
      fetchBanners();

    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setUploading(false);
    }
  };

  // 🖊️ เปิด Modal สำหรับช่องที่เลือก
  const openModalForSlot = (slotDef: any, existingData: any) => {
    setActiveSlot(slotDef);
    
    if (existingData) {
      setEditingId(existingData.id);
      setTitle(existingData.title || slotDef.name);
      setLinkUrl(existingData.link_url || '');
      setIsActive(existingData.is_active !== false);
      setPreviewImage(existingData.image_url);
    } else {
      setEditingId(null);
      setTitle(slotDef.name); // ตั้งชื่อปริยายให้เลย
      setLinkUrl('');
      setIsActive(true);
      setPreviewImage(null);
    }
    
    setBase64Image(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setActiveSlot(null); setEditingId(null);
    setTitle(''); setLinkUrl(''); setIsActive(true);
    setPreviewImage(null); setBase64Image(null);
  };

  // 🗑️ ลบรูปออกจากช่อง (จริงๆ คือลบแถวทิ้งไปเลย ให้มันกลับเป็นกล่องว่าง)
  const handleDelete = (id: number, slotName: string) => {
    Alert.alert('ยืนยันการลบ', `เคลียร์รูปภาพจากช่อง ${slotName} ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: async () => {
          await supabase.from('banners').delete().eq('id', id);
          fetchBanners();
        } 
      }
    ]);
  };

  // 📝 เรนเดอร์การ์ด 6 ช่อง
  const renderSlotCard = (slotDef: any) => {
    const existingData = banners.find(b => b.slot_name === slotDef.id);

    // ถ้ายังไม่มีรูป (กล่องเปล่าๆ)
    if (!existingData || !existingData.image_url) {
      return (
        <TouchableOpacity key={slotDef.id} style={styles.emptyCard} onPress={() => openModalForSlot(slotDef, null)}>
          <View style={styles.emptyContent}>
            <Ionicons name="image-outline" size={40} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>อัปโหลด {slotDef.name}</Text>
            <Text style={styles.emptySub}>คลิกเพื่อตั้งค่า</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // ถ้ามีรูปลงช่องแล้ว
    const dateStr = existingData.created_at ? new Date(existingData.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'ล่าสุด';

    return (
      <View key={slotDef.id} style={styles.bannerCard}>
        <Image source={{ uri: existingData.image_url }} style={styles.bannerImage} />
        
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{existingData.title || slotDef.name}</Text>
          <Text style={styles.slotBadgeText}>{slotDef.name}</Text>
          
          <View style={styles.bannerMetaRow}>
            <View style={[styles.statusBadge, {backgroundColor: existingData.is_active !== false ? '#EBE4FF' : '#F5F5F5'}]}>
              <Text style={[styles.statusText, {color: existingData.is_active !== false ? '#5E35B1' : '#9E9E9E'}]}>
                {existingData.is_active !== false ? 'แสดงอยู่' : 'ซ่อนอยู่'}
              </Text>
            </View>
            <Text style={styles.dateText}>อัปโหลด {dateStr}</Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openModalForSlot(slotDef, existingData)}>
              <Text style={styles.editBtnText}>แก้ไข</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(existingData.id, slotDef.name)}>
              <Text style={styles.deleteBtnText}>ลบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 👑 Header โค้งสีน้ำเงิน (อยู่หลังสุด) */}
      <View style={styles.headerBg}>
        <View style={styles.headerCurve} />
      </View>

      {/* 👑 ส่วนหัวที่มีปุ่มย้อนกลับ (ดึงมาหน้าสุด zIndex 10 จะได้กดติดชัวร์ๆ) */}
      <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.headerTitle}>จัดการแบนเนอร์</Text>
            <Text style={styles.headerSub}>เปลี่ยนรูปข่าวสารบนหน้า Home (ระบบ 6 ช่อง)</Text>
          </View>
          {/* ลบปุ่มวงกลมตัว A ออกแล้ว */}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#F57F17" style={{marginTop: 2}} />
          <View style={{marginLeft: 10, flex: 1}}>
            <Text style={styles.warningTitle}>หมายเหตุ</Text>
            <Text style={styles.warningDesc}>ระบบล็อกไว้ที่ 6 ตำแหน่ง หากลบจะเป็นการเคลียร์ช่องนั้นให้ว่าง</Text>
            <Text style={styles.warningDesc}>สัดส่วน 16:9 สำหรับสไลเดอร์ / 16:8 กริดซ้ายล่าง / 9:16 กริดขวา</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
        ) : (
          <View style={styles.gridContainer}>
            {FIXED_SLOTS.map(renderSlotCard)}
          </View>
        )}
      </ScrollView>

      {/* 📝 Modal ฟอร์มสร้าง/แก้ไข (สำหรับ Slot ที่เลือก) */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{editingId ? 'แก้ไขแบนเนอร์' : 'ตั้งค่าแบนเนอร์ใหม่'}</Text>
                  <Text style={styles.modalSubTitle}>สำหรับช่อง: {activeSlot?.name}</Text>
                </View>
                <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
              </View>

              <Text style={styles.label}>ชื่อแบนเนอร์ / แคมเปญ</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="เช่น โปรโมชั่นสงกรานต์" placeholderTextColor="#BDBDBD" />

              {/* 🖼️ กล่องอัปโหลดรูปภาพ */}
              <TouchableOpacity style={styles.uploadDropzone} onPress={pickImage}>
                {previewImage ? (
                  <Image source={{ uri: previewImage }} style={styles.previewImg} />
                ) : (
                  <View style={{alignItems: 'center'}}>
                    <Ionicons name="image-outline" size={40} color="#BDBDBD" />
                    <Text style={styles.dropzoneTitle}>คลิกหรือลากไฟล์มาวางที่นี่</Text>
                    <Text style={styles.dropzoneSub}>PNG, JPG, WebP - ไม่เกิน 2MB</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>ลิงก์เมื่อกด (ถ้ามี)</Text>
              <TextInput style={styles.input} value={linkUrl} onChangeText={setLinkUrl} placeholder="https://..." placeholderTextColor="#BDBDBD" autoCapitalize="none"/>

              <Text style={styles.label}>สถานะ:</Text>
              <View style={styles.rowGrid}>
                 <TouchableOpacity style={[styles.statusToggleBtn, isActive && styles.statusToggleActive]} onPress={() => setIsActive(true)}>
                    <Text style={[styles.statusToggleText, isActive && {color: '#5E35B1'}]}>เปิดใช้งาน</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.statusToggleBtn, !isActive && styles.statusToggleActive]} onPress={() => setIsActive(false)}>
                    <Text style={[styles.statusToggleText, !isActive && {color: '#5E35B1'}]}>ซ่อนไว้ก่อน (Draft)</Text>
                 </TouchableOpacity>
              </View>

              {/* ปุ่มบันทึก / ยกเลิก */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBanner} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#FFF" style={{marginRight: 6}}/>
                      <Text style={styles.saveBtnText}>{editingId ? 'บันทึกแก้ไข' : 'บันทึกรูปภาพ'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  
  // Header
  headerBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, position: 'absolute', top: 0, left: 0, right: 0, height: 180, overflow: 'hidden', zIndex: 0 },
  headerCurve: { position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#B0B2C3', fontSize: 12, marginTop: 2 },

  scrollContent: { padding: 20, paddingTop: 90, paddingBottom: 50 },

  // Warning Box
  warningBox: { flexDirection: 'row', backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFD54F', padding: 15, borderRadius: 15, marginBottom: 20 },
  warningTitle: { color: '#F57F17', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  warningDesc: { color: '#F57F17', fontSize: 10, lineHeight: 16 },

  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  // Empty Card (Placeholder)
  emptyCard: { width: '48%', backgroundColor: '#F8F9FA', borderRadius: 15, marginBottom: 15, height: 180, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  emptyContent: { alignItems: 'center', padding: 10 },
  emptyTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 9, color: '#9E9E9E', marginTop: 2 },

  // Filled Card
  bannerCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 15, marginBottom: 15, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#EEEEEE' },
  bannerImage: { width: '100%', height: 90, backgroundColor: '#E0E0E0' },
  bannerContent: { padding: 12 },
  bannerTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  slotBadgeText: { fontSize: 9, color: '#FF9800', fontWeight: 'bold', marginBottom: 8 }, // ป้ายบอกชื่อช่อง
  
  bannerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  dateText: { fontSize: 9, color: '#9E9E9E' },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  editBtn: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 6, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  editBtnText: { color: '#757575', fontSize: 10, fontWeight: 'bold' },
  deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: '#F44336', fontSize: 10, fontWeight: 'bold' },

  // Modal สว่าง
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#333', fontSize: 18, fontWeight: 'bold' },
  modalSubTitle: { color: '#FF9800', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  
  label: { color: '#333', fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#FFF', color: '#333', height: 45, borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10, fontSize: 13 },
  
  uploadDropzone: { backgroundColor: '#F8F9FA', borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 15, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  dropzoneTitle: { color: '#333', fontSize: 13, fontWeight: 'bold', marginTop: 10 },
  dropzoneSub: { color: '#9E9E9E', fontSize: 10, marginTop: 5 },

  rowGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '100%' },

  statusToggleBtn: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  statusToggleActive: { backgroundColor: '#F3E5F5', borderColor: '#5E35B1' },
  statusToggleText: { fontSize: 12, fontWeight: 'bold', color: '#757575' },

  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, marginBottom: 20 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10 },
  cancelBtnText: { color: '#757575', fontSize: 13, fontWeight: 'bold' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#5E35B1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', elevation: 2 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});