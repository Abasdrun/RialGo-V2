import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AdminDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* 👑 Header Admin */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ศูนย์บัญชาการ (Admin)</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.welcomeBox}>
          <Ionicons name="shield-checkmark" size={40} color="#4CAF50" />
          <Text style={styles.welcomeTitle}>ระบบจัดการ RailGo</Text>
          <Text style={styles.welcomeSub}>ยินดีต้อนรับพนักงานการรถไฟ</Text>
        </View>

        {/* 🎛️ เมนูแอดมิน */}
        <Text style={styles.sectionTitle}>เมนูการจัดการ</Text>

        {/* ✅ ปุ่มจัดการรอบรถไฟ */}
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/admin-trips')}
        >
          <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
            <Ionicons name="train" size={24} color="#2196F3" />
          </View>
          <View style={styles.menuTextInfo}>
            <Text style={styles.menuTitle}>จัดการรอบรถไฟ (Trips)</Text>
            <Text style={styles.menuSub}>เพิ่ม ลบ แก้ไข รอบการเดินทาง</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>

        {/* ✅ เติม onPress ให้ปุ่มจัดการคูปองตรงนี้! */}
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/admin-coupons')}
        >
          <View style={[styles.iconBox, {backgroundColor: '#FCE4EC'}]}>
            <MaterialCommunityIcons name="ticket-percent" size={24} color="#E91E63" />
          </View>
          <View style={styles.menuTextInfo}>
            <Text style={styles.menuTitle}>จัดการคูปองส่วนลด</Text>
            <Text style={styles.menuSub}>สร้างโค้ดโปรโมชั่นใหม่ให้ลูกค้า</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>

        {/* 🆕 ปุ่มจัดการแบนเนอร์ (Banners) ที่เรากำลังจะทำต่อไป! */}
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/admin-banners')}
        >
          <View style={[styles.iconBox, {backgroundColor: '#E8F5E9'}]}>
            <Ionicons name="images" size={24} color="#4CAF50" />
          </View>
          <View style={styles.menuTextInfo}>
            <Text style={styles.menuTitle}>จัดการแบนเนอร์ (Banners)</Text>
            <Text style={styles.menuSub}>เปลี่ยนรูปข่าวสารบนหน้า Home</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>

        {/* ✅ ปุ่มกระจายข่าวสาร */}
        <TouchableOpacity 
          style={styles.menuCard}
          onPress={() => router.push('/admin-broadcast')}
        >
          <View style={[styles.iconBox, {backgroundColor: '#FFF3E0'}]}>
            <Ionicons name="megaphone" size={24} color="#FF9800" />
          </View>
          <View style={styles.menuTextInfo}>
            <Text style={styles.menuTitle}>กระจายข่าวสาร (Broadcast)</Text>
            <Text style={styles.menuSub}>ยิงแจ้งเตือนหาผู้โดยสารทุกคน</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1E36' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  welcomeBox: { alignItems: 'center', backgroundColor: '#2A2C49', padding: 30, borderRadius: 20, marginBottom: 30 },
  welcomeTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  welcomeSub: { color: '#AAA', fontSize: 14, marginTop: 5 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2C49', padding: 15, borderRadius: 20, marginBottom: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  menuTextInfo: { flex: 1, marginLeft: 15 },
  menuTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  menuSub: { color: '#AAA', fontSize: 12, marginTop: 2 }
});