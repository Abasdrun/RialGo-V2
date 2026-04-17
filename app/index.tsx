import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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

  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'สวัสดีตอนเช้า☀️' : currentHour < 18 ? 'สวัสดีตอนบ่าย🌤️' : 'สวัสดีตอนเย็น🌙';

  const sliderSlots = ['slider_1', 'slider_2', 'slider_3'];

  return (
    <View style={styles.mainContainer}>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 🌊 Header สีน้ำเงินเข้ม */}
        <View style={styles.blueHeaderBg}>
          <View style={styles.headerGraphicCircle} />
          
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            
            {/* 🛡️ แถวบน: ชื่อผู้ใช้ + โล่แอดมินดีไซน์พรีเมียม */}
            <View style={styles.headerTopRow}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingSub}>{greetingText}</Text>
                <Text style={styles.greetingName}>คุณ{fullName || 'ผู้โดยสาร'}</Text>
              </View>

              {/* 🚀 ปุ่มโล่แอดมินแบบ Glassmorphism (เฉพาะ Admin) */}
              {userRole === 'admin' && (
                <TouchableOpacity 
                  style={styles.adminShieldBtn} 
                  onPress={() => router.push('/admin')}
                >
                  <MaterialCommunityIcons name="shield-check" size={28} color="#FFD700" />
                  <View style={styles.adminStatusDot} />
                </TouchableOpacity>
              )}
            </View>

            {/* 🔍 ช่องค้นหาคลีนๆ (ลบฟันเฟืองออกแล้ว) */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.6)" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="ค้นหาข้อมูลเส้นทาง..." 
                placeholderTextColor="rgba(255,255,255,0.4)" 
              />
            </View>
          </SafeAreaView>
        </View>

        {/* 📰 แบนเนอร์สไลเดอร์ */}
        <View style={styles.bannerWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false} 
            onScroll={onScroll} 
            scrollEventThrottle={16}
          >
            {sliderSlots.map((slot, index) => (
              <View key={slot} style={styles.bannerSlide}>
                {bannerSlots[slot] ? (
                  <Image source={{ uri: bannerSlots[slot] }} style={styles.bannerImage} />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Text style={styles.placeholderText}>RailGo News {index + 1}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.paginationDots}>
            {sliderSlots.map((_, i) => (
              <View key={i} style={[styles.dot, activeSlide === i && styles.activeDot]} />
            ))}
          </View>
        </View>

        {/* 🎛️ เมนูด่วน */}
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

        {/* 🖼️ Grid รูปภาพ 2 ช่องตั้งตามดีไซน์ใหม่ */}
        <View style={styles.gridContainer}>
          <View style={styles.gridBox}>
            {bannerSlots['grid_left_top'] && <Image source={{ uri: bannerSlots['grid_left_top'] }} style={styles.gridImageFull} />}
          </View>
          <View style={styles.gridBox}>
            {bannerSlots['grid_right'] && <Image source={{ uri: bannerSlots['grid_right'] }} style={styles.gridImageFull} />}
          </View>
        </View>

      </ScrollView>

      {/* 📲 Bottom Navigation Bar */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#5E35B1" />
          <Text style={[styles.navText, { color: '#5E35B1' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/location')}>
          <Ionicons name="location-outline" size={24} color="#333" />
          <Text style={styles.navText}>Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          <Text style={styles.navText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={24} color="#333" />
          <Text style={styles.navText}>My Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { paddingBottom: 110 }, 
  
  blueHeaderBg: { 
    backgroundColor: '#262956', 
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    paddingBottom: 90, 
    position: 'relative',
    overflow: 'hidden'
  },
  headerGraphicCircle: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#2E3166',
  },
  headerSafeArea: { paddingHorizontal: 25, paddingTop: 10 },
  
  headerTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20 
  },
  greetingContainer: { flex: 1 },
  greetingSub: { fontSize: 14, color: '#D1C4E9', marginBottom: 2 },
  greetingName: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },

  // 🛡️ สไตล์โล่แอดมินแบบพรีเมียม
  adminShieldBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.35)', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  adminStatusDot: { 
    position: 'absolute', 
    bottom: -1, 
    right: -1, 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#4CAF50', 
    borderWidth: 2,
    borderColor: '#262956'
  },

  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#FFF' },
  
  bannerWrapper: { 
    marginTop: -60, 
    marginHorizontal: 20, 
    height: 220, 
    borderRadius: 25, 
    backgroundColor: '#FFF', 
    overflow: 'hidden', 
    marginBottom: 30, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  bannerSlide: { width: width - 40, height: 220 },
  bannerImage: { width: '100%', height: '100%' },
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
  gridBox: { width: '48%', height: 200, borderRadius: 25, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0', elevation: 1 },
  gridImageFull: { width: '100%', height: '100%' },

  bottomNavBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F5F5F5' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#333', marginTop: 4 },
});

