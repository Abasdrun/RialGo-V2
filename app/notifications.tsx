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
  
  // 🚀 State สำหรับจำว่าการ์ดไหนโดนกดกางออกบ้าง
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

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

  // 🚀 อ่านเฉพาะรายตัวเวลากด
  const markSingleAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // 🚀 เปลี่ยนไอคอนแอดมิน (system) ให้โคตรเด่น สีส้มแดง (Deep Orange) โทรโข่งประกาศ
  const getIconData = (type: string) => {
    switch (type) {
      case 'ticket': return { icon: 'ticket-confirmation-outline', color: '#4CAF50', bg: '#E8F5E9', action: 'ดูตั๋ว →' };
      case 'promotion': return { icon: 'tag-outline', color: '#FBC02D', bg: '#FFF9C4', action: 'ใช้โปรโมชั่น →' };
      case 'reward': return { icon: 'star-outline', color: '#5E35B1', bg: '#EDE7F6', action: 'ดูคะแนน →' };
      case 'system': return { icon: 'bullhorn-outline', color: '#FF5722', bg: '#FBE9E7', action: 'รับทราบ' };
      default: return { icon: 'bell-outline', color: '#9E9E9E', bg: '#F5F5F5', action: '' };
    }
  };

  const filteredNotis = notifications.filter(n => activeTab === 'all' || n.type === activeTab);
  const todayNotis = filteredNotis.filter(n => isToday(n.created_at));
  const olderNotis = filteredNotis.filter(n => !isToday(n.created_at));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = (item: Notification) => {
    const iconData = getIconData(item.type);
    const isExpanded = expandedIds.includes(item.id);
    const isLongText = item.message.length > 45; // เช็คว่าข้อความยาวพอจะกางได้ไหม
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.notiCard, item.is_read ? styles.notiCardRead : styles.notiCardUnread]}
        activeOpacity={0.7}
        onPress={() => {
          if (!item.is_read) markSingleAsRead(item.id);
          toggleExpand(item.id);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: iconData.bg }]}>
          <MaterialCommunityIcons name={iconData.icon as any} size={24} color={iconData.color} />
        </View>
        
        <View style={styles.notiContent}>
          <Text style={styles.notiTitle} numberOfLines={1}>{item.title}</Text>
          
          {/* 🚀 ตัดคำถ้าไม่ได้กางออก ถ้ายาวให้มีคำว่า อ่านเพิ่มเติม */}
          <Text style={styles.notiMessage} numberOfLines={isExpanded ? undefined : 2}>
            {item.message}
          </Text>
          
          {!isExpanded && isLongText && (
            <Text style={styles.readMoreText}>อ่านเพิ่มเติม...</Text>
          )}
          
          <View style={styles.notiFooter}>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#9E9E9E" />
              <Text style={styles.timeText}> {timeAgo(item.created_at)}</Text>
            </View>

            {/* 🚀 ปุ่ม Action แยกต่างหาก พอกดแล้ววาร์ปได้เลย */}
            {iconData.action !== '' && (
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={(e) => {
                  if (!item.is_read) markSingleAsRead(item.id);
                  if (item.type === 'ticket') {
                    // วาร์ปไปหน้าตั๋วของฉัน
                    router.push('/my-ticket'); 
                  } else if (item.type === 'system') {
                    // แอดมินบังคับให้รู้แล้วกางอ่าน
                    if (!isExpanded) toggleExpand(item.id);
                  }
                }}
              >
                <Text style={[styles.actionText, {color: iconData.color}]}>{iconData.action}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
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
  notiMessage: { fontSize: 11, color: '#757575', lineHeight: 18, marginBottom: 5 }, // 🚀 เพิ่ม lineHeight ให้อ่านง่าย
  readMoreText: { fontSize: 10, color: '#5E35B1', fontWeight: 'bold', marginBottom: 10, marginTop: -3 }, // 🚀 ตัวอักษรอ่านเพิ่มเติม
  
  notiFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 10, color: '#9E9E9E' },
  actionBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)' }, // 🚀 กรอบปุ่ม action 
  actionText: { fontSize: 11, fontWeight: 'bold' },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5E35B1', position: 'absolute', top: 15, right: 15 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 14 },
});