import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

const { width } = Dimensions.get('window');

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ticket' | 'promotion' | 'reward' | 'system';
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'ticket' | 'promotion' | 'system'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setNotifications(data);
        } else {
          // 🛡️ Fallback Mock Data เอาไว้โชว์ UI สวยๆ เผื่อ DB โล่ง
          setNotifications(mockNotifications);
        }
      } else {
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันกด "อ่านทั้งหมด"
  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error(error);
    }
  };

  // ฟังก์ชันแปลงเวลา (เช่น 2 นาทีที่แล้ว)
  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHrs < 24) return `${diffHrs} ชั่วโมงที่แล้ว`;
    if (diffDays === 1) return 'เมื่อวานนี้';
    return `${diffDays} วันที่แล้ว`;
  };

  // แยกกลุ่ม "วันนี้" กับ "เมื่อวาน/ก่อนหน้า"
  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getIconData = (type: string) => {
    switch (type) {
      case 'ticket': return { icon: 'ticket-confirmation-outline', color: '#4CAF50', bg: '#E8F5E9', action: 'ดูตั๋ว →' };
      case 'promotion': return { icon: 'tag-outline', color: '#FBC02D', bg: '#FFF9C4', action: 'ใช้เลย →' };
      case 'reward': return { icon: 'star-outline', color: '#5E35B1', bg: '#EDE7F6', action: 'ดูคะแนน →' };
      default: return { icon: 'account-group-outline', color: '#9E9E9E', bg: '#F5F5F5', action: '' };
    }
  };

  const filteredNotis = notifications.filter(n => activeTab === 'all' || n.type === activeTab);
  const todayNotis = filteredNotis.filter(n => isToday(n.created_at));
  const olderNotis = filteredNotis.filter(n => !isToday(n.created_at));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = (item: Notification) => {
    const iconData = getIconData(item.type);
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.notiCard, item.is_read ? styles.notiCardRead : styles.notiCardUnread]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: iconData.bg }]}>
          <MaterialCommunityIcons name={iconData.icon as any} size={24} color={iconData.color} />
        </View>
        
        <View style={styles.notiContent}>
          <Text style={styles.notiTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notiMessage} numberOfLines={2}>{item.message}</Text>
          
          <View style={styles.notiFooter}>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#9E9E9E" />
              <Text style={styles.timeText}> {timeAgo(item.created_at)}</Text>
            </View>
            {iconData.action !== '' && (
              <Text style={[styles.actionText, {color: iconData.color}]}>{iconData.action}</Text>
            )}
          </View>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 🌊 Header สีน้ำเงินเข้ม */}
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
      </View>

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        
        <View style={styles.headerTopRow}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
          </View>
          
          <TouchableOpacity style={styles.markReadBtn} onPress={markAllAsRead}>
            <Text style={styles.markReadText}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        {/* 🔘 Tabs Filter */}
        <View style={styles.tabScrollWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'all' ? styles.tabBtnActive : styles.tabBtnInactive]} onPress={() => setActiveTab('all')}>
              <Text style={[styles.tabText, activeTab === 'all' ? styles.tabTextActive : styles.tabTextInactive]}>ทั้งหมด {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'ticket' ? styles.tabBtnActive : styles.tabBtnInactive]} onPress={() => setActiveTab('ticket')}>
              <Text style={[styles.tabText, activeTab === 'ticket' ? styles.tabTextActive : styles.tabTextInactive]}>ตั๋ว</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'promotion' ? styles.tabBtnActive : styles.tabBtnInactive]} onPress={() => setActiveTab('promotion')}>
              <Text style={[styles.tabText, activeTab === 'promotion' ? styles.tabTextActive : styles.tabTextInactive]}>โปรโมชั่น</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabBtn, activeTab === 'system' ? styles.tabBtnActive : styles.tabBtnInactive]} onPress={() => setActiveTab('system')}>
              <Text style={[styles.tabText, activeTab === 'system' ? styles.tabTextActive : styles.tabTextInactive]}>ระบบ</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {todayNotis.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>วันนี้</Text>
                {todayNotis.map(renderNotification)}
              </View>
            )}

            {olderNotis.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>เมื่อวาน / ก่อนหน้า</Text>
                {olderNotis.map(renderNotification)}
              </View>
            )}

            {filteredNotis.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={50} color="#BDBDBD" />
                <Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>
              </View>
            )}

          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  safeArea: { flex: 1, zIndex: 10 },
  
  blueHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: '#2E3165', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, zIndex: 0 },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  
  markReadBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  markReadText: { color: '#D1C4E9', fontSize: 12, fontWeight: 'bold' },

  tabScrollWrapper: { marginBottom: 15 },
  tabContainer: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFF' },
  tabBtnInactive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#2E3165' },
  tabTextInactive: { color: '#D1C4E9' },
  
  badge: { backgroundColor: '#5E35B1', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 5 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, color: '#757575', marginBottom: 15, marginLeft: 5 },

  notiCard: { flexDirection: 'row', padding: 15, borderRadius: 20, marginBottom: 15 },
  notiCardUnread: { backgroundColor: '#FFF', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#5E35B1', borderLeftWidth: 4 },
  notiCardRead: { backgroundColor: '#EEEEEE', opacity: 0.8 },
  
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  
  notiContent: { flex: 1, justifyContent: 'center' },
  notiTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  notiMessage: { fontSize: 11, color: '#757575', lineHeight: 16, marginBottom: 10 },
  
  notiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 10, color: '#9E9E9E' },
  actionText: { fontSize: 11, fontWeight: 'bold' },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5E35B1', position: 'absolute', top: 15, right: 15 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 14 },
});

// ข้อมูลจำลองเผื่อ Database ยังไม่มีข้อมูล จะได้โชว์ UI สวยๆ
const mockNotifications: Notification[] = [
  { id: '1', title: 'จองตั๋วสำเร็จ!', message: 'กรุงเทพ → เชียงใหม่ · 27 มี.ค. 2026 · 18:10 น.\nที่นั่ง A1 ตู้ 8 ชั้น 2', type: 'ticket', is_read: false, created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: '2', title: 'โปรสงกรานต์ 30% OFF!', message: 'ใช้โค้ด SONGKRAN30 ซื้อตั๋วช่วง 9-15 เม.ย.\nลดทันที 30% ทุกเส้นทาง', type: 'promotion', is_read: false, created_at: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: '3', title: 'ได้รับ 38 คะแนนสะสม', message: 'คะแนนสะสมจากการจองตั๋ว ปัจจุบัน\nมี 2,388 คะแนน', type: 'reward', is_read: true, created_at: new Date(Date.now() - 180 * 60000).toISOString() },
  { id: '4', title: 'ยืนยันบัญชีสำเร็จ', message: 'บัญชีของคุณได้รับการยืนยันแล้ว ยินดีต้อนรับสู่ RailGo!', type: 'system', is_read: true, created_at: new Date(Date.now() - 25 * 60 * 60000).toISOString() }
];