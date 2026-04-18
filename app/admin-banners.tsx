import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, TextInput, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';

interface AlertConfig {
  visible: boolean;
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  confirmText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

// 🚀 [คืนค่าเดิม] ใช้ ID เดิมเป๊ะๆ รูปเก่าจะได้ไม่หาย แต่ลบช่องที่ 6 ออกเพราะหน้า Home มึงมีแค่ 2 กล่อง
const FIXED_SLOTS = [
  { id: 'slider_1', name: 'สไลเดอร์ 1 (บนสุด)' },
  { id: 'slider_2', name: 'สไลเดอร์ 2 (ตรงกลาง)' },
  { id: 'slider_3', name: 'สไลเดอร์ 3 (ล่างสุด)' },
  { id: 'grid_left_top', name: 'รูปกริด ซ้าย' }, // ใช้ ID เดิม
  { id: 'grid_right', name: 'รูปกริด ขวา' },     // ใช้ ID เดิม
];

export default function AdminBannersScreen() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: 'warning',
    title: '',
    message: '',
    confirmText: 'ตกลง',
  });

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

  const showAlert = (config: Omit<AlertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ type: 'error', title: 'การเข้าถึงถูกปฏิเสธ', message: 'กรุณาอนุญาตให้เข้าถึงรูปภาพในตั้งค่า' });
      return;
    }

    let aspect: [number, number] = [16, 9];
    // 🚀 [จุดที่แก้ให้] ถ้าอัปโหลดรูปกล่องด้านล่าง ระบบจะบังคับให้มึงครอบรูปเป็นจัตุรัส (1:1) อัตโนมัติ
    if (activeSlot?.id === 'grid_left_top' || activeSlot?.id === 'grid_right') {
      aspect = [1, 1]; 
    }

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

  const handleSaveBanner = async () => {
    if (!title) {
      showAlert({ type: 'warning', title: 'ข้อมูลไม่ครบ', message: 'กรุณากรอกชื่อแบนเนอร์' });
      return;
    }
    if (!editingId && !base64Image) {
      showAlert({ type: 'warning', title: 'รูปภาพว่าง', message: 'กรุณาอัปโหลดรูปภาพ' });
      return;
    }

    try {
      setUploading(true);
      let finalImageUrl = previewImage; 

      if (base64Image) {
        const fileName = `${activeSlot.id}_${new Date().getTime()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars') 
          .upload(`banners/${fileName}`, decode(base64Image), { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(`banners/${fileName}`);
        finalImageUrl = data.publicUrl;
      }

      const payload = {
        slot_name: activeSlot.id,
        title: title,
        image_url: finalImageUrl,
        link_url: linkUrl,
        is_active: isActive
      };

      if (editingId) {
        const { error } = await supabase.from('banners').update(payload).eq('id', editingId);
        if (error) throw error;
        setModalVisible(false);
        showAlert({ 
          type: 'success', 
          title: 'สำเร็จ', 
          message: `อัปเดต ${activeSlot.name} เรียบร้อย!`,
          onConfirm: () => { closeAlert(); fetchBanners(); }
        });
      } else {
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
        setModalVisible(false);
        showAlert({ 
          type: 'success', 
          title: 'สำเร็จ', 
          message: `อัปโหลด ${activeSlot.name} เรียบร้อย!`,
          onConfirm: () => { closeAlert(); fetchBanners(); }
        });
      }
    } catch (error: any) {
      showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: error.message });
    } finally {
      setUploading(false);
    }
  };

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
      setTitle(slotDef.name);
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

  const handleDelete = (id: number, slotName: string) => {
    showAlert({
      type: 'warning',
      title: 'ยืนยันการลบ',
      message: `คุณต้องการลบรูปภาพจากช่อง ${slotName} ใช่หรือไม่?`,
      confirmText: 'ลบรูปภาพ',
      showCancel: true,
      onConfirm: async () => {
        closeAlert();
        await supabase.from('banners').delete().eq('id', id);
        fetchBanners();
      }
    });
  };

  const renderSlotCard = (slotDef: any) => {
    const existingData = banners.find(b => b.slot_name === slotDef.id);

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
      <View style={styles.headerBg} />

      <SafeAreaView edges={['top']} style={{ zIndex: 10 }}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.backBtnCircle}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.headerTitle}>จัดการแบนเนอร์</Text>
            <Text style={styles.headerSub}>เปลี่ยนรูปข่าวสารบนหน้า Home (ระบบ 5 ช่อง)</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={20} color="#F57F17" style={{marginTop: 2}} />
          <View style={{marginLeft: 10, flex: 1}}>
            <Text style={styles.warningTitle}>หมายเหตุอัตราส่วนภาพ</Text>
            <Text style={styles.warningDesc}>สไลเดอร์ (บนสุด) ตัดแบบ 16:9 / ส่วนกริด (ด้านล่าง) ตัดแบบ 1:1</Text>
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

      <Modal animationType="fade" transparent visible={alertConfig.visible}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <View style={[styles.alertIconCircle, 
              alertConfig.type === 'success' ? {backgroundColor: '#E8F5E9'} : 
              alertConfig.type === 'error' ? {backgroundColor: '#FFEBEE'} : {backgroundColor: '#FFF8E1'}
            ]}>
              <Ionicons 
                name={alertConfig.type === 'success' ? 'checkmark-circle' : alertConfig.type === 'error' ? 'alert-circle' : 'warning'} 
                size={40} 
                color={alertConfig.type === 'success' ? '#4CAF50' : alertConfig.type === 'error' ? '#EF5350' : '#FFB300'} 
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={styles.alertActionRow}>
              {alertConfig.showCancel && (
                <TouchableOpacity style={styles.alertCancelBtn} onPress={closeAlert}>
                  <Text style={styles.alertCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.alertConfirmBtn, !alertConfig.showCancel ? {flex: 1} : {flex: 1}]} 
                onPress={alertConfig.onConfirm || closeAlert}
              >
                <Text style={styles.alertConfirmText}>{alertConfig.confirmText || 'ตกลง'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

              <TouchableOpacity style={styles.uploadDropzone} onPress={pickImage}>
                {previewImage ? (
                  <Image source={{ uri: previewImage }} style={styles.previewImg} />
                ) : (
                  <View style={{alignItems: 'center'}}>
                    <Ionicons name="image-outline" size={40} color="#BDBDBD" />
                    <Text style={styles.dropzoneTitle}>คลิกเพื่อเลือกรูปภาพ</Text>
                    <Text style={styles.dropzoneSub}>ระบบจะบังคับให้ตัดภาพอัตโนมัติ</Text>
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
  headerBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, position: 'absolute', top: 0, left: 0, right: 0, height: 180, zIndex: 0 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtnCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#B0B2C3', fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20, paddingTop: 90, paddingBottom: 50 },
  warningBox: { flexDirection: 'row', backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFD54F', padding: 15, borderRadius: 15, marginBottom: 20 },
  warningTitle: { color: '#F57F17', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  warningDesc: { color: '#F57F17', fontSize: 10, lineHeight: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyCard: { width: '48%', backgroundColor: '#F8F9FA', borderRadius: 15, marginBottom: 15, height: 180, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  emptyContent: { alignItems: 'center', padding: 10 },
  emptyTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 9, color: '#9E9E9E', marginTop: 2 },
  bannerCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 15, marginBottom: 15, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#EEEEEE' },
  bannerImage: { width: '100%', height: 90, backgroundColor: '#E0E0E0' },
  bannerContent: { padding: 12 },
  bannerTitle: { fontSize: 11, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  slotBadgeText: { fontSize: 9, color: '#FF9800', fontWeight: 'bold', marginBottom: 8 },
  bannerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  dateText: { fontSize: 9, color: '#9E9E9E' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  editBtn: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 6, borderRadius: 8, alignItems: 'center', marginRight: 5 },
  editBtnText: { color: '#757575', fontSize: 10, fontWeight: 'bold' },
  deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  deleteBtnText: { color: '#F44336', fontSize: 10, fontWeight: 'bold' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 25, padding: 25, alignItems: 'center', elevation: 10 },
  alertIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  alertMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  alertActionRow: { flexDirection: 'row', width: '100%', gap: 10, justifyContent: 'center', alignItems: 'center' },
  alertCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 15, backgroundColor: '#F5F5F5', alignItems: 'center' },
  alertCancelText: { color: '#757575', fontWeight: 'bold' },
  alertConfirmBtn: { paddingVertical: 14, borderRadius: 15, backgroundColor: '#5E35B1', justifyContent: 'center', alignItems: 'center', minWidth: 120 },
  alertConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
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
  statusToggleBtn: { flex: 1, borderWidth: 1, borderColor: '#E0E0E0', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  statusToggleActive: { backgroundColor: '#F3E5F5', borderColor: '#5E35B1' },
  statusToggleText: { fontSize: 12, fontWeight: 'bold', color: '#757575' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, marginBottom: 20 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', marginRight: 10 },
  cancelBtnText: { color: '#757575', fontSize: 13, fontWeight: 'bold' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#5E35B1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', elevation: 2 },
  saveBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
});