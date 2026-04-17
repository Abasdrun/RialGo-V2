import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router'; 
import { supabase } from '../supabase';
import * as ImagePicker from 'expo-image-picker'; 

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const pathname = usePathname(); 
    const [email, setEmail] = useState('loading...');
    const [name, setName] = useState('Yoon'); 
    const [initial, setInitial] = useState('Y');
    
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false); // Modal ออกจากระบบ
    const [editName, setEditName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
      fetchUserData();
    }, []);

    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || 'No Email');
          const displayName = user.user_metadata?.full_name || 'Yoon';
          setName(displayName);
          setInitial(displayName.charAt(0).toUpperCase());
          if (user.user_metadata?.avatar_url) {
              setProfileImage(user.user_metadata.avatar_url);
          }
        } else {
          setEmail('guest@railgo.com');
          setName('Guest User');
          setInitial('G');
        }
      } catch (error) {
        console.error(error);
      }
    };

    const pickImage = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ขออภัย', 'แอปจำเป็นต้องขออนุญาตเข้าถึงอัลบั้มภาพของคุณครับ');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setProfileImage(selectedImageUri);
      }
    };

    const handleUpdateProfile = async () => {
      if (!editName.trim()) {
        Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อของคุณครับ');
        return;
      }
      setIsUpdating(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: editName }
        });
        if (error) throw error;
        setName(editName);
        setInitial(editName.charAt(0).toUpperCase());
        setIsEditModalVisible(false);
        Alert.alert('สำเร็จ', 'อัปเดตชื่อโปรไฟล์เรียบร้อยแล้ว! 🎉');
      } catch (error: any) {
        Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถอัปเดตข้อมูลได้');
      } finally {
        setIsUpdating(false);
      }
    };

    const openEditModal = () => {
      setEditName(name);
      setIsEditModalVisible(true);
    };

    // 🚀 ฟังก์ชัน Logout ใหม่
    const handleLogoutPress = () => {
      setIsLogoutModalVisible(true);
    };

    const confirmLogout = async () => {
      try {
        await supabase.auth.signOut();
        setIsLogoutModalVisible(false);
        router.replace('/login'); 
      } catch (error) {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
      }
    };

    const handleTabPress = (tabPath: any) => {
      if (pathname !== tabPath) {
        router.replace(tabPath);
      }
    };

    return (
      <View style={styles.container}>
        
        <View style={styles.blueHeaderBg}>
          <View style={styles.headerGraphicCircle1} />
          <View style={styles.headerGraphicCircle2} />
        </View>

        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnArea}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
              <Text style={styles.headerTitle}>My Profile</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Profile Header Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initial}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.editBadge} onPress={pickImage}>
                  <Ionicons name="pencil" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userNameText}>{name}</Text>
              <Text style={styles.userEmailText}>{email}</Text>
              <View style={styles.memberSinceBadge}>
                <Ionicons name="calendar-outline" size={12} color="#D1C4E9" style={{marginRight: 5}} />
                <Text style={styles.memberSinceText}>สมาชิกตั้งแต่ มกราคม 2024</Text>
              </View>
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={[styles.statValue, {color: '#5E35B1'}]}>47</Text>
                <Text style={styles.statLabelThai}>เที่ยวที่จอง</Text>
                <Text style={styles.statLabelEng}>TRIPS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statValue, {color: '#4CAF50'}]}>12,840</Text>
                <Text style={styles.statLabelThai}>กม. ที่เดินทาง</Text>
                <Text style={styles.statLabelEng}>KM</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statValue, {color: '#FBC02D'}]}>2,350</Text>
                <Text style={styles.statLabelThai}>คะแนนสะสม</Text>
                <Text style={styles.statLabelEng}>PTS</Text>
              </View>
            </View>

            {/* Membership Card */}
            <View style={styles.membershipCard}>
              <View style={styles.goldBadge}>
                <Ionicons name="star" size={10} color="#FBC02D" />
                <Text style={styles.goldBadgeText}>Gold Member</Text>
              </View>
              <View style={styles.membershipContent}>
                <View style={styles.membershipIconBox}>
                  <Ionicons name="star-outline" size={24} color="#4CAF50" />
                </View>
                <View style={styles.membershipInfo}>
                  <Text style={styles.membershipName}>{name}</Text>
                  <Text style={styles.membershipExpiry}>ต่ออายุปีถัดไป ธ.ค. 2026</Text>
                </View>
                <View style={styles.membershipPoints}>
                  <Text style={styles.pointsValue}>2,350</Text>
                  <Text style={styles.pointsLabel}>คะแนน</Text>
                </View>
              </View>
            </View>

            <Text style={styles.menuSectionTitle}>บัญชีและระดับ</Text>
            
            {/* Menu List */}
            <View style={styles.menuCard}>
              <TouchableOpacity style={styles.menuRow} onPress={openEditModal}>
                <View style={[styles.menuIconBox, {backgroundColor: '#EBE4FF'}]}>
                  <Ionicons name="person-outline" size={20} color="#5E35B1" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuMainText}>ข้อมูลส่วนตัว</Text>
                  <Text style={styles.menuSubText}>ชื่อ, อีเมล, เบอร์โทร</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuRow}>
                <View style={[styles.menuIconBox, {backgroundColor: '#E0F2F1'}]}>
                  <Ionicons name="document-text-outline" size={20} color="#00BCD4" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuMainText}>เอกสารของฉัน</Text>
                  <Text style={styles.menuSubText}>บัตรประชาชน, พาสปอร์ต</Text>
                </View>
                <View style={styles.menuBadgePurple}><Text style={styles.menuBadgeTextWhite}>2 ใบ</Text></View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuRow}>
                <View style={[styles.menuIconBox, {backgroundColor: '#FFF9C4'}]}>
                  <Ionicons name="card-outline" size={20} color="#FBC02D" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuMainText}>วิธีการชำระเงิน</Text>
                  <Text style={styles.menuSubText}>บัตร, PromptPay, TrueMoney</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuRow}>
                <View style={[styles.menuIconBox, {backgroundColor: '#EDE7F6'}]}>
                  <Ionicons name="star-outline" size={20} color="#7E57C2" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuMainText}>คะแนนสะสม & รางวัล</Text>
                  <Text style={styles.menuSubText}>ดูและแลกคะแนน</Text>
                </View>
                <View style={styles.menuBadgeYellow}><Text style={styles.menuBadgeTextYellow}>2,350 pts</Text></View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuRow} onPress={handleLogoutPress}>
                <View style={[styles.menuIconBox, {backgroundColor: '#FFEBEE'}]}>
                  <Ionicons name="log-out-outline" size={20} color="#F44336" />
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuMainText, {color: '#F44336'}]}>ออกจากระบบ</Text>
                  <Text style={styles.menuSubText}>ลงชื่อออกเพื่อสลับบัญชีผู้ใช้</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* 🚀 Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/')}>
            <Ionicons name={pathname === '/' ? "home" : "home-outline"} size={24} color={pathname === '/' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/' && styles.tabItemTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/location')}>
            <Ionicons name={pathname === '/location' ? "location" : "location-outline"} size={24} color={pathname === '/location' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/location' && styles.tabItemTextActive]}>Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/notifications')}>
            <Ionicons name={pathname === '/notifications' ? "notifications" : "notifications-outline"} size={24} color={pathname === '/notifications' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/notifications' && styles.tabItemTextActive]}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => handleTabPress('/profile')}>
            <Ionicons name={pathname === '/profile' ? "person-circle" : "person-circle-outline"} size={26} color={pathname === '/profile' ? "#5E35B1" : "#757575"} />
            <Text style={[styles.tabItemText, pathname === '/profile' && styles.tabItemTextActive]}>My Profile</Text>
          </TouchableOpacity>
        </View>

        {/* 🚀 Edit Profile Modal */}
        <Modal visible={isEditModalVisible} animationType="fade" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.editModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>แก้ไขข้อมูลส่วนตัว</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>ชื่อ-นามสกุล</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#5E35B1" style={{marginRight: 10}} />
                <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="กรอกชื่อของคุณ" placeholderTextColor="#BDBDBD" />
              </View>
              <Text style={styles.inputLabel}>อีเมล (ไม่สามารถเปลี่ยนได้)</Text>
              <View style={[styles.inputWrapper, {backgroundColor: '#F5F5F5'}]}>
                <Ionicons name="mail-outline" size={20} color="#9E9E9E" style={{marginRight: 10}} />
                <TextInput style={[styles.textInput, {color: '#9E9E9E'}]} value={email} editable={false} />
              </View>
              <TouchableOpacity style={[styles.saveBtn, isUpdating && {opacity: 0.7}]} onPress={handleUpdateProfile} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* 🚀 Modern Logout Modal */}
        <Modal visible={isLogoutModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={styles.logoutIconCircle}>
                <Ionicons name="log-out" size={32} color="#F44336" />
              </View>
              <Text style={styles.logoutTitle}>ออกจากระบบ</Text>
              <Text style={styles.logoutSubTitle}>คุณต้องการออกจากระบบใช่หรือไม่?{'\n'}เราจะคิดถึงคุณนะ!</Text>
              <View style={styles.logoutActionRow}>
                <TouchableOpacity style={styles.cancelLogoutBtn} onPress={() => setIsLogoutModalVisible(false)}>
                  <Text style={styles.cancelLogoutText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmLogoutBtn} onPress={confirmLogout}>
                  <Text style={styles.confirmLogoutText}>ออกจากระบบ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    safeArea: { flex: 1, zIndex: 1 },
    blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 420, backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', zIndex: 0 },
    headerGraphicCircle1: { position: 'absolute', right: -50, top: 50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.05)' },
    headerGraphicCircle2: { position: 'absolute', left: -100, top: 150, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.03)' },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, zIndex: 20 },
    backBtnArea: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120 }, 
    profileSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
    avatarContainer: { position: 'relative', marginBottom: 15 },
    avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3F51B5', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#262956', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    userNameText: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
    userEmailText: { fontSize: 12, color: '#A8AACC', marginBottom: 15 },
    memberSinceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#5E35B1' },
    memberSinceText: { fontSize: 11, color: '#FFF' },
    statsCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 25, paddingVertical: 20, paddingHorizontal: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
    statCol: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    statLabelThai: { fontSize: 10, color: '#757575', marginBottom: 2 },
    statLabelEng: { fontSize: 9, color: '#BDBDBD', fontWeight: 'bold' },
    statDivider: { width: 1, backgroundColor: '#EEEEEE', marginVertical: 10 },
    membershipCard: { backgroundColor: '#1E2046', borderRadius: 25, padding: 20, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    goldBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251,192,45,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, alignSelf: 'flex-start', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(251,192,45,0.5)' },
    goldBadgeText: { fontSize: 10, color: '#FBC02D', fontWeight: 'bold', marginLeft: 5 },
    membershipContent: { flexDirection: 'row', alignItems: 'center' },
    membershipIconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#4CAF50' },
    membershipInfo: { flex: 1 },
    membershipName: { fontSize: 14, fontWeight: 'bold', color: '#FFF', marginBottom: 3 },
    membershipExpiry: { fontSize: 10, color: '#A8AACC' },
    membershipPoints: { alignItems: 'flex-end' },
    pointsValue: { fontSize: 20, fontWeight: 'bold', color: '#FBC02D' },
    pointsLabel: { fontSize: 10, color: '#A8AACC' },
    menuSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginLeft: 5, marginBottom: 15 },
    menuCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    menuIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuTextCol: { flex: 1, justifyContent: 'center' },
    menuMainText: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    menuSubText: { fontSize: 10, color: '#9E9E9E' },
    menuDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 10 },
    menuBadgePurple: { backgroundColor: '#D1C4E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 10 },
    menuBadgeTextWhite: { fontSize: 10, color: '#5E35B1', fontWeight: 'bold' },
    menuBadgeYellow: { backgroundColor: '#FFF9C4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#FBC02D' },
    menuBadgeTextYellow: { fontSize: 10, color: '#FBC02D', fontWeight: 'bold' },
    
    // Bottom Tab Bar
    bottomTabBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', elevation: 20, zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 },
    tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, height: '100%' },
    tabItemText: { fontSize: 10, color: '#757575', marginTop: 4, fontWeight: '500' },
    tabItemTextActive: { fontSize: 10, color: '#5E35B1', marginTop: 4, fontWeight: 'bold' },
    
    // Modal & Forms
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    editModalContainer: { width: '100%', backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    inputLabel: { fontSize: 12, color: '#757575', marginBottom: 8, marginLeft: 5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 15, paddingHorizontal: 15, height: 50, marginBottom: 20 },
    textInput: { flex: 1, fontSize: 16, color: '#333' },
    saveBtn: { backgroundColor: '#5E35B1', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    // Logout Modal Styles
    logoutModalContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    logoutIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    logoutTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    logoutSubTitle: { fontSize: 14, color: '#757575', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
    logoutActionRow: { flexDirection: 'row', width: '100%', gap: 12 },
    cancelLogoutBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
    cancelLogoutText: { fontSize: 15, fontWeight: '600', color: '#757575' },
    confirmLogoutBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F44336' },
    confirmLogoutText: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  });