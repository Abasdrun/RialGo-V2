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
  
  // 📌 สร้าง Object เก็บรูปตาม Slot Name
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

  // ✅ ใช้ Math.round เพื่อให้จุดไข่ปลาเปลี่ยนตรงจังหวะแม่นๆ
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    if (slide !== activeSlide) setActiveSlide(slide);
  };

  // เช็คเวลาเพื่อเปลี่ยนคำทักทาย
  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'สวัสดีตอนเช้า☀️' : currentHour < 18 ? 'สวัสดีตอนบ่าย🌤️' : 'สวัสดีตอนเย็น🌙';

  // 📌 บังคับสร้าง Array 3 ช่อง เพื่อให้สไลเดอร์เลื่อนได้ตลอดเวลา แม้จะไม่มีรูปก็ตาม!
  const sliderSlots = ['slider_1', 'slider_2', 'slider_3'];

  return (
    <View style={styles.mainContainer}>
      
      {/* 🚀 ใช้ ScrollView คลุมทั้งหมด เพื่อให้ Header เลื่อนตามไปได้สวยๆ ไม่โดนตัด */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 🌊 Header สีน้ำเงินเข้ม (ดีไซน์โค้งมน มีวงกลมซ้อน) */}
        <View style={styles.blueHeaderBg}>
          {/* วงกลมตกแต่งด้านหลัง (Graphic) */}
          <View style={styles.headerGraphicCircle} />
          
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingSub}>{greetingText}</Text>
              <Text style={styles.greetingName}>คุณ{fullName || 'ผู้โดยสาร'}</Text>
            </View>

            {/* ช่องค้นหาโปร่งแสง */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color="#fff5f5" />
              <TextInput 
                style={styles.searchInput} 
                placeholder="" 
                placeholderTextColor="#333" 
              />
              {userRole === 'admin' ? (
                <TouchableOpacity onPress={() => router.push('/admin')}>
                  <Ionicons name="settings" size={20} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity>
                  <Ionicons name="settings-outline" size={20} color="#333" />
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </View>

        {/* 📰 แบนเนอร์สไลเดอร์ 3 รูป (ดันขึ้นไปทับ Header ด้วย marginTop ติดลบ) */}
        <View style={styles.bannerWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false} 
            onScroll={onScroll} 
            scrollEventThrottle={16}
          >
            {/* ✅ ลูปสร้าง 3 หน้าเสมอ แก้บั๊กเลื่อนไม่ได้! */}
            {sliderSlots.map((slot, index) => (
              <View key={slot} style={styles.bannerSlide}>
                {bannerSlots[slot] ? (
                  <Image source={{ uri: bannerSlots[slot] }} style={styles.bannerImage} />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <Text style={styles.placeholderText}>ข่าวสาร {index + 1}</Text>
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

        {/* 🎛️ เมนูด่วน (Quick Menu) */}
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

        {/* 🖼️ Grid รูปภาพด้านล่าง (ปรับเป็น 2 กล่องแนวตั้งตามเรฟเฟอเรนซ์) */}
        <View style={styles.gridContainer}>
          <View style={styles.gridBox}>
            {bannerSlots['grid_left_top'] && <Image source={{ uri: bannerSlots['grid_left_top'] }} style={styles.gridImageFull} />}
          </View>
          <View style={styles.gridBox}>
            {bannerSlots['grid_right'] && <Image source={{ uri: bannerSlots['grid_right'] }} style={styles.gridImageFull} />}
          </View>
        </View>

      </ScrollView>

      {/* 📲 Bottom Navigation Bar (ปรับสีไอคอน Active ให้เป๊ะตามรูป) */}
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

// 📐 ปรับสไตล์ให้เป๊ะตามภาพที่สุด!
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  scrollContent: { paddingBottom: 110 }, 
  
  // 🌊 Header สีน้ำเงินเข้ม
  blueHeaderBg: { 
    backgroundColor: '#262956', // สีน้ำเงินเข้มตามเรฟ
    borderBottomLeftRadius: 40, 
    borderBottomRightRadius: 40, 
    paddingBottom: 90, // เผื่อพื้นที่ให้แบนเนอร์มาทับ
    position: 'relative',
    overflow: 'hidden'
  },
  // Graphic วงกลมสว่างๆ ด้านขวาของ Header
  headerGraphicCircle: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#2E3166', // สีสว่างขึ้นมานิดนึง
  },
  headerSafeArea: { paddingHorizontal: 25, paddingTop: 20 },
  
  greetingContainer: { marginBottom: 25, marginTop: 10 },
  greetingSub: { fontSize: 14, color: '#D1C4E9', marginBottom: 5 },
  greetingName: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },

  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#FFF' },
  
  // 📰 แบนเนอร์ (ทับ Header ด้วย marginTop ติดลบ)
  bannerWrapper: { 
    marginTop: -70, // 📌 ดันขึ้นไปทับ Header
    marginHorizontal: 20, 
    height: 220, 
    borderRadius: 25, 
    backgroundColor: '#FFF', 
    overflow: 'hidden', 
    marginBottom: 30, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },
  bannerSlide: { width: width - 40, height: 220 }, // บังคับความกว้างให้พอดี 1 หน้าจอเป๊ะ
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 36, color: '#E0E0E0', fontWeight: '300' },
  
  paginationDots: { position: 'absolute', bottom: 15, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#BDBDBD' }, // สีเทาเข้มตามเรฟ
  
  // 🎛️ เมนูด่วน
  quickMenuSection: { paddingHorizontal: 25, marginBottom: 30 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginRight: 15 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 },
  menuItem: { alignItems: 'center', width: '30%' },
  menuIconSquare: { width: 65, height: 65, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  menuText: { fontSize: 12, color: '#333', textAlign: 'center' },

  // 🖼️ Grid รูปภาพด้านล่าง (2 กล่องตั้งๆ)
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  gridBox: { width: '48%', height: 200, borderRadius: 25, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0' },
  gridImageFull: { width: '100%', height: '100%' },

  // 📲 Bottom Nav
  bottomNavBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 70, backgroundColor: '#FFF', borderRadius: 35, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F5F5F5' },
  navItem: { alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#333', marginTop: 4 },
});