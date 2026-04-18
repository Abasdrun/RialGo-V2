import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router'; 
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [userRole, setUserRole] = useState('user');
  const [fullName, setFullName] = useState('');
  const [bannerSlots, setBannerSlots] = useState<Record<string, string>>({});

  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
      if (data) {
        if (data.role) setUserRole(data.role);
        if (data.full_name) setFullName(data.full_name);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBanners();
    }, [])
  );

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*');
    if (data) {
      const slots: Record<string, string> = {};
      data.forEach(item => {
        slots[item.slot_name] = item.image_url;
      });
      setBannerSlots(slots);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    if (slide !== activeSlide) setActiveSlide(slide);
  };

  const handleSearchSubmit = () => {
    const text = searchText.toLowerCase().trim();
    if (text === '') return;

    if (text === 'book ticket' || text === 'จองตั๋ว') {
      router.push('/(booking)/book-ticket');
    } else if (text === 'my ticket' || text === 'ตั๋วของฉัน') {
      router.push('/my-ticket');
    } else if (text === 'coupon' || text === 'คูปอง') {
      router.push('/coupon');
    } else {
      setModalMsg(`ไม่พบข้อมูลสำหรับ "${searchText}"\nกรุณาตรวจสอบตัวสะกดอีกครั้ง`);
      setIsModalVisible(true);
    }
  };

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'สวัสดีตอนเช้า☀️' : currentHour < 18 ? 'สวัสดีตอนบ่าย🌤️' : 'สวัสดีตอนเย็น🌙';

  const sliderSlots = ['slider_1', 'slider_2', 'slider_3'];

  return (
    <View style={styles.mainContainer}>
      
      <Modal
        transparent={true}
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="search" size={40} color="#FF5252" />
              </View>
            </View>
            <Text style={styles.modalTitle}>ค้นหาไม่สำเร็จ</Text>
            <Text style={styles.modalSubText}>{modalMsg}</Text>
            <View style={styles.modalButtonWrapper}>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalPrimaryBtnText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.blueHeaderBg}>
          <View style={styles.headerGraphicCircle} />
          
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.headerTopRow}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingSub}>{greetingText}</Text>
                <Text style={styles.greetingName}>คุณ{fullName || 'ผู้โดยสาร'}</Text>
              </View>

              {userRole === 'admin' && (
                <TouchableOpacity style={styles.adminShieldBtn} onPress={() => router.push('/admin')}>
                  <MaterialCommunityIcons name="shield-check" size={28} color="#FFD700" />
                  <View style={styles.adminStatusDot} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.6)" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="ค้นหาข้อมูลเส้นทาง..." 
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.bannerWrapper}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
            {sliderSlots.map((slot, index) => (
              <View key={slot} style={styles.bannerSlide}>
                {bannerSlots[slot] ? <Image source={{ uri: bannerSlots[slot] }} style={styles.bannerImage} /> : 
                <View style={styles.bannerPlaceholder}><Text style={styles.placeholderText}>RailGo News {index + 1}</Text></View>}
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {sliderSlots.map((_, i) => <View key={i} style={[styles.dot, activeSlide === i && styles.activeDot]} />)}
          </View>
        </View>

        <View style={styles.quickMenuSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>เมนูด่วน</Text>
            <View style={styles.sectionLine} />
          </View>

          <View style={styles.menuRow}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(booking)/book-ticket')}>
              <View style={[styles.menuIconSquare, { backgroundColor: '#D0CDE1' }]}>
                <Ionicons name="train" size={28} color="#5E35B1" />
              </View>
              <Text style={styles.menuText}>Book Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-ticket')}>
              <View style={[styles.menuIconSquare, { backgroundColor: '#C9F2E3' }]}>
                <MaterialCommunityIcons name="ticket-confirmation" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>My Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/coupon')}>
              <View style={[styles.menuIconSquare, { backgroundColor: '#F6E5A8' }]}>
                <Ionicons name="pricetag" size={28} color="#FBC02D" />
              </View>
              <Text style={styles.menuText}>Coupon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🚀 [คืนค่าเดิม] ใช้ ID เดิมเป๊ะๆ รูปเก่าจะเด้งกลับมา และเพิ่ม resizeMode ให้รูปไม่แหว่ง */}
        <View style={styles.gridContainer}>
          <View style={styles.gridBox}>
            {bannerSlots['grid_left_top'] && <Image source={{ uri: bannerSlots['grid_left_top'] }} style={styles.gridImageFull} resizeMode="cover" />}
          </View>
          <View style={styles.gridBox}>
            {bannerSlots['grid_right'] && <Image source={{ uri: bannerSlots['grid_right'] }} style={styles.gridImageFull} resizeMode="cover" />}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem}><Ionicons name="home" size={24} color="#5E35B1" /><Text style={[styles.navText, { color: '#5E35B1' }]}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/location')}><Ionicons name="location-outline" size={24} color="#333" /><Text style={styles.navText}>Location</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/notifications')}><Ionicons name="notifications-outline" size={24} color="#333" /><Text style={styles.navText}>Notifications</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}><Ionicons name="person-outline" size={24} color="#333" /><Text style={styles.navText}>My Profile</Text></TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { paddingBottom: 110 }, 
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: width * 0.82, backgroundColor: '#FFF', borderRadius: 35, padding: 25, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  modalIconContainer: { marginBottom: 20 },
  modalIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalSubText: { fontSize: 15, color: '#777', textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  modalButtonWrapper: { width: '100%' },
  modalPrimaryBtn: { backgroundColor: '#FF5252', paddingVertical: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#FF5252', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  modalPrimaryBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },

  blueHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 90, position: 'relative', overflow: 'hidden' },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2E3166' },
  headerSafeArea: { paddingHorizontal: 25, paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingContainer: { flex: 1 },
  greetingSub: { fontSize: 14, color: '#D1C4E9', marginBottom: 2 },
  greetingName: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  adminShieldBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 215, 0, 0.35)', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
  adminStatusDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#262956' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 20, paddingHorizontal: 15, height: 45, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#FFF' },
  
  bannerWrapper: { marginTop: -60, marginHorizontal: 20, height: 220, borderRadius: 25, backgroundColor: '#FFF', overflow: 'hidden', marginBottom: 30, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, borderWidth: 1, borderColor: '#EEEEEE' },
  bannerSlide: { width: width - 40, height: 220 },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 24, color: '#E0E0E0', fontWeight: 'bold' },
  paginationDots: { position: 'absolute', bottom: 15, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#BDBDBD' },
  
  quickMenuSection: { paddingHorizontal: 25, marginBottom: 30 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginRight: 15 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 },
  menuItem: { alignItems: 'center', width: '30%' },
  menuIconSquare: { width: 65, height: 65, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  menuText: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },
  
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  // 🚀 [จุดที่แก้ให้] เอาความสูง 200 ออก แล้วยัดความยืดหยุ่น aspectRatio: 1 (จัตุรัส) เข้าไปแทน
  gridBox: { width: '48%', aspectRatio: 1, borderRadius: 25, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0', elevation: 1 },
  gridImageFull: { width: '100%', height: '100%' },
  
  bottomNavBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F5F5F5' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#333', marginTop: 4 },
});