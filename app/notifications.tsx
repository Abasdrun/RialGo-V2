import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // ดึงอันใหม่สุดขึ้นก่อน

      if (data) {
        setNotifications(data);
      }
    }
    setLoading(false);
  };

  // ฟังก์ชันเลือกไอคอนและสีตาม type
  const getIconData = (type: string) => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
      case 'warning': return { name: 'warning', color: '#FF9800', bg: '#FFF3E0' };
      case 'ticket': return { name: 'ticket', color: '#5E35B1', bg: '#EDE7F6' };
      default: return { name: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const iconData = getIconData(item.type);
    // แปลงวันที่ให้อ่านง่าย
    const dateObj = new Date(item.created_at);
    const timeString = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')} น.`;
    const dateString = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear() + 543}`;

    return (
      <TouchableOpacity style={styles.notiCard}>
        <View style={[styles.iconBox, { backgroundColor: iconData.bg }]}>
          <Ionicons name={iconData.name as any} size={24} color={iconData.color} />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.notiTitle}>{item.title}</Text>
          <Text style={styles.notiMessage}>{item.message}</Text>
          <Text style={styles.notiTime}>{dateString} • {timeString}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔝 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Ionicons name="notifications-outline" size={20} color="#333" />
          <Text style={styles.titleText}>Notifications</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5E35B1" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderNotificationItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>ยังไม่มีการแจ้งเตือนใดๆ</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  listContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  notiCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: '#EEEEEE' },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContent: { flex: 1, justifyContent: 'center' },
  notiTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  notiMessage: { fontSize: 12, color: '#757575', marginBottom: 8, lineHeight: 18 },
  notiTime: { fontSize: 10, color: '#9E9E9E' },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9E9E9E', marginTop: 15, fontSize: 16 },
});