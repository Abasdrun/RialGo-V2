import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
// 🔴 Path supabase ดึงจากโฟลเดอร์นอกสุดเหมือนหน้า login
import { supabase } from '../supabase'; 

export default function MyTicketScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 State สำหรับคุมการเปิด/ปิดหน้ารายละเอียดตั๋ว
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          status,
          created_at,
          origin:origin_station_id(station_name),
          destination:destination_station_id(station_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const formattedTickets = data.map((b, index) => {
          const isUpcoming = index % 2 === 0; 
          return {
            id: b.id,
            origin: b.origin?.station_name || 'สถานีกลางกรุงเทพอภิวัฒน์',
            destination: b.destination?.station_name || 'สถานีชุมพร',
            total_price: b.total_price || 2120,
            status: isUpcoming ? 'upcoming' : 'history',
            dateText: isUpcoming ? 'ส., 21 ก.พ. 2026' : 'ส., 07 มี.ค. 2026',
            depTime: '06:00 น.',
            arrTime: '12:30 น.',
            duration: '6 ชั่วโมง 30 นาที',
            trainInfo: 'ด่วนพิเศษ 7',
            seatInfo: 'A1 - ตู้ 8',
            countdownText: isUpcoming ? 'ออกใน 4 ชม.' : 'เดินทางแล้ว'
          };
        });
        setTickets(formattedTickets);
      }
    }
    setLoading(false);
  };

  const filteredTickets = tickets.filter(t => t.status === activeTab);

  const renderTicketCard = ({ item }: { item: any }) => (
    // 🔴 เปลี่ยนเป็น TouchableOpacity เพื่อกดดูรายละเอียด
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => setSelectedTicket(item)}
    >
      <View style={styles.cardTop}>
        <View style={styles.headerRow}>
          <View style={styles.dateGroup}>
            <Ionicons name="calendar-outline" size={16} color="#333" />
            <Text style={styles.dateText}>{item.dateText} | {item.duration}</Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'history' && styles.statusBadgeHistory]}>
            <Text style={[styles.statusText, item.status === 'history' && styles.statusTextHistory]}>
              {item.status === 'upcoming' ? 'ที่จะมาถึง' : 'เสร็จสิ้น'}
            </Text>
          </View>
        </View>
        <Text style={styles.trainInfoText}>{item.trainInfo}</Text>

        <View style={styles.routeContainer}>
          <View style={styles.stationBlock}>
            <Text style={styles.stationName}>{item.origin}</Text>
            <Text style={styles.timeDetail}>{item.depTime}</Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <View style={styles.arrowLine} />
            <Ionicons name="caret-forward" size={12} color="#9E9E9E" style={styles.arrowHead} />
          </View>

          <View style={styles.stationBlockRight}>
            <Text style={styles.stationName}>{item.destination}</Text>
            <Text style={styles.timeDetail}>{item.arrTime}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dashedDivider} />

      <View style={styles.cardBottom}>
        <View style={styles.seatBadge}>
          <Text style={styles.seatText}>{item.seatInfo}</Text>
        </View>
        
        <View style={styles.countdownGroup}>
          <Ionicons name={item.status === 'upcoming' ? "time-outline" : "checkmark-circle"} size={16} color={item.status === 'upcoming' ? "#FBC02D" : "#4CAF50"} />
          <Text style={[styles.countdownText, item.status === 'history' && {color: '#4CAF50'}]}>
             {item.countdownText}
          </Text>
        </View>

        <Text style={styles.priceText}>THB {item.total_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="#333" />
          <Text style={styles.titleText}>My Ticket</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>ที่จะมาถึง</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>ประวัติการเดินทาง</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1C1E36" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderTicketCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={60} color="#E0E0E0" />
              <Text style={styles.emptyText}>ไม่มีข้อมูลตั๋วในหมวดหมู่นี้</Text>
            </View>
          }
        />
      )}

      {/* 🚀 Modal หน้ารายละเอียดตั๋ว (Ticket Detail) */}
      <Modal visible={!!selectedTicket} animationType="slide" onRequestClose={() => setSelectedTicket(null)}>
        {selectedTicket && (
          <SafeAreaView style={styles.detailContainer}>
            {/* 🔝 Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.detailBackBtn}>
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={styles.detailTitleBox}>
                <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="#333" />
                <Text style={styles.detailTitleText}>Ticket Detail</Text>
              </View>
              <View style={{width: 40}} />
            </View>

            <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
              {/* 🏷️ Status & ID */}
              <View style={styles.statusRow}>
                  <View style={[styles.statusBadgeDark, selectedTicket.status === 'history' && {backgroundColor: '#333'}]}>
                      <View style={[styles.greenDot, selectedTicket.status === 'history' && {backgroundColor: '#9E9E9E'}]} />
                      <Text style={[styles.statusTextDark, selectedTicket.status === 'history' && {color: '#9E9E9E'}]}>
                        {selectedTicket.status === 'upcoming' ? 'ยืนยันแล้ว' : 'สิ้นสุดการเดินทาง'}
                      </Text>
                  </View>
                  <Text style={styles.ticketIdText}>#TH-2026-{String(selectedTicket.id).substring(0,4).padStart(4, '0')}</Text>
              </View>

              {/* 🛤️ Route Info (Dark Area) */}
              <View style={styles.routeHeader}>
                  <View style={styles.routeCol}>
                      <Text style={styles.routeStation}>{selectedTicket.origin}</Text>
                      <Text style={styles.routeTime}>{selectedTicket.depTime}</Text>
                  </View>
                  <View style={styles.routeArrow}>
                      <Text style={styles.durationTextTop}>{selectedTicket.duration}</Text>
                      <Ionicons name="arrow-forward" size={24} color="#7E57C2" />
                  </View>
                  <View style={[styles.routeCol, {alignItems: 'flex-end'}]}>
                      <Text style={styles.routeStation}>{selectedTicket.destination}</Text>
                      <Text style={styles.routeTime}>{selectedTicket.arrTime}</Text>
                  </View>
              </View>

              {/* 🎟️ White Ticket Card */}
              <View style={styles.detailTicketCard}>
                  {/* 3 Pills (Date, Seat, Cabin) */}
                  <View style={styles.pillsRow}>
                      <View style={styles.pillBox}>
                          <Text style={styles.pillLabel}>วันที่</Text>
                          <Text style={styles.pillValue}>{selectedTicket.dateText.split('|')[0].trim()}</Text>
                          <View style={styles.pillDot} />
                      </View>
                      <View style={styles.pillBox}>
                          <Text style={styles.pillLabel}>ที่นั่ง</Text>
                          <Text style={styles.pillValue}>{String(selectedTicket.seatInfo).replace(' - ตู้ 8', '')}</Text>
                          <View style={styles.pillDot} />
                      </View>
                      <View style={styles.pillBox}>
                          <Text style={styles.pillLabel}>ตู้</Text>
                          <Text style={styles.pillValue}>8</Text>
                          <View style={styles.pillDot} />
                      </View>
                  </View>

                  {/* Timeline */}
                  <View style={styles.timelineSection}>
                      <View style={styles.timelineCol}>
                          <Text style={styles.timeTextBold}>{selectedTicket.depTime}</Text>
                          <Ionicons name="train" size={20} color="#1C1E36" style={{marginVertical: 15}} />
                          <Text style={styles.timeTextBold}>{selectedTicket.arrTime}</Text>
                      </View>
                      <View style={styles.timelineLine}>
                          <View style={styles.dotFilledDetail} />
                          <View style={styles.verticalLineDetail} />
                          <View style={styles.dotOutlineDetail} />
                      </View>
                      <View style={styles.stationCol}>
                          <Text style={styles.stationTextBold}>{selectedTicket.origin}</Text>
                          <View style={styles.waitingInfo}>
                              <Ionicons name={selectedTicket.status === 'upcoming' ? "time-outline" : "checkmark-circle"} size={14} color={selectedTicket.status === 'upcoming' ? "#FBC02D" : "#4CAF50"} />
                              <Text style={[styles.waitingText, selectedTicket.status === 'history' && {color: '#4CAF50'}]}> {selectedTicket.countdownText}</Text>
                          </View>
                          <Text style={styles.stationTextBold}>{selectedTicket.destination}</Text>
                      </View>
                  </View>

                  <View style={styles.dashedDividerDetail} />

                  {/* 4 Grid Info Boxes */}
                  <View style={styles.gridInfoRow}>
                      <View style={styles.gridInfoBox}>
                          <MaterialCommunityIcons name="view-grid-outline" size={20} color="#7E57C2" />
                          <View style={styles.gridTextWrap}>
                              <Text style={styles.gridLabel}>ประเภท</Text>
                              <Text style={styles.gridValue}>ชั้น 2 ปรับอากาศ</Text>
                          </View>
                      </View>
                      <View style={styles.gridInfoBox}>
                          <Ionicons name="location-outline" size={20} color="#4CAF50" />
                          <View style={styles.gridTextWrap}>
                              <Text style={styles.gridLabel}>ขบวน</Text>
                              <Text style={styles.gridValue}>{selectedTicket.trainInfo}</Text>
                          </View>
                      </View>
                  </View>
                  <View style={styles.gridInfoRow}>
                      <View style={styles.gridInfoBox}>
                          <MaterialCommunityIcons name="currency-usd-circle-outline" size={20} color="#FBC02D" />
                          <View style={styles.gridTextWrap}>
                              <Text style={styles.gridLabel}>ราคา</Text>
                              <Text style={styles.gridValue}>THB {selectedTicket.total_price.toLocaleString('en-US', {minimumFractionDigits: 2})}</Text>
                          </View>
                      </View>
                      <View style={styles.gridInfoBox}>
                          <Ionicons name="train-outline" size={20} color="#7E57C2" />
                          <View style={styles.gridTextWrap}>
                              <Text style={styles.gridLabel}>สถานีต้นทาง</Text>
                              <Text style={styles.gridValue} numberOfLines={1}>{selectedTicket.origin}</Text>
                          </View>
                      </View>
                  </View>
              </View>
            </ScrollView>

            {/* 🟡 Bottom Yellow Countdown Banner */}
            <View style={[styles.bottomBanner, selectedTicket.status === 'history' && {borderColor: '#4CAF50'}]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name={selectedTicket.status === 'upcoming' ? "time" : "checkmark-circle"} size={28} color={selectedTicket.status === 'upcoming' ? "#FBC02D" : "#4CAF50"} />
                    <View style={{marginLeft: 10}}>
                        <Text style={[styles.bannerSubText, selectedTicket.status === 'history' && {color: '#4CAF50'}]}>
                          {selectedTicket.status === 'upcoming' ? 'ออกเดินทางใน' : 'สถานะ'}
                        </Text>
                        <Text style={[styles.bannerMainText, selectedTicket.status === 'history' && {color: '#4CAF50'}]}>
                          {selectedTicket.status === 'upcoming' ? '4 ชม. 22 นาที' : 'เดินทางสำเร็จ'}
                        </Text>
                    </View>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.bannerDateText}>{selectedTicket.dateText.substring(0, 10)}</Text>
                </View>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ===================== 
  // STYLES ของหน้าตั๋วรวม
  // ===================== 
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  titleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 30, marginHorizontal: 20, padding: 5, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 20 },
  tabButton: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 25 },
  tabActive: { backgroundColor: '#1C1E36' },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#9E9E9E' },
  tabTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 50 },
  ticketCard: { backgroundColor: '#E2DFEC', borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  cardTop: { padding: 20, paddingBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  dateGroup: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 12, fontWeight: 'bold', color: '#333', marginLeft: 5 },
  statusBadge: { backgroundColor: '#D1C4E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeHistory: { backgroundColor: '#E0E0E0' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#5E35B1' },
  statusTextHistory: { color: '#757575' },
  trainInfoText: { fontSize: 11, color: '#757575', marginBottom: 20 },
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stationBlock: { flex: 1, alignItems: 'flex-start' },
  stationBlockRight: { flex: 1, alignItems: 'flex-end' },
  stationName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  timeDetail: { fontSize: 11, color: '#757575', marginTop: 2 },
  arrowContainer: { width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  arrowLine: { flex: 1, height: 1, backgroundColor: '#9E9E9E' },
  arrowHead: { marginLeft: -3 },
  dashedDivider: { height: 1, width: '100%', borderWidth: 1, borderStyle: 'dashed', borderColor: '#BDBDBD', borderRadius: 1 },
  cardBottom: { padding: 20, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seatBadge: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
  seatText: { fontSize: 12, fontWeight: 'bold', color: '#5E35B1' },
  countdownGroup: { flexDirection: 'row', alignItems: 'center' },
  countdownText: { fontSize: 12, fontWeight: 'bold', color: '#FBC02D', marginLeft: 5 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9E9E9E', marginTop: 10, fontSize: 16 },

  // ===================== 
  // STYLES ของหน้า Modal (Ticket Detail)
  // ===================== 
  detailContainer: { flex: 1, backgroundColor: '#0B0C1A' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  detailBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  detailTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, height: 45, marginHorizontal: 15, paddingHorizontal: 15 },
  detailTitleText: { marginLeft: 10, fontSize: 14, fontWeight: 'bold', color: '#333' },
  detailScrollContent: { padding: 20, paddingBottom: 100 },
  
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusBadgeDark: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2924', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginRight: 5 },
  statusTextDark: { color: '#4CAF50', fontSize: 10, fontWeight: 'bold' },
  ticketIdText: { color: '#AAA', fontSize: 10, marginLeft: 15 },

  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  routeCol: { flex: 1 },
  routeStation: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  routeTime: { color: '#AAA', fontSize: 12, marginTop: 5 },
  routeArrow: { alignItems: 'center', paddingHorizontal: 10 },
  durationTextTop: { color: '#7E57C2', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },

  detailTicketCard: { backgroundColor: '#F0F0F5', borderRadius: 30, padding: 20 },
  pillsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -35 },
  pillBox: { width: '31%', backgroundColor: '#13142B', borderRadius: 20, paddingVertical: 15, alignItems: 'center', position: 'relative' },
  pillLabel: { color: '#AAA', fontSize: 10, marginBottom: 5 },
  pillValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  pillDot: { position: 'absolute', top: 8, left: 10, width: 4, height: 4, borderRadius: 2, backgroundColor: '#7E57C2' },

  timelineSection: { flexDirection: 'row', marginTop: 30, marginBottom: 20 },
  timelineCol: { justifyContent: 'space-between', alignItems: 'center', width: 45 },
  timeTextBold: { fontSize: 12, fontWeight: 'bold', color: '#13142B' },
  timelineLine: { width: 20, alignItems: 'center', paddingVertical: 5 },
  dotFilledDetail: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#13142B' },
  verticalLineDetail: { flex: 1, width: 2, backgroundColor: '#13142B', marginVertical: 2 },
  dotOutlineDetail: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#13142B', backgroundColor: '#F0F0F5' },
  stationTextBold: { fontSize: 14, fontWeight: 'bold', color: '#13142B' },
  waitingInfo: { flexDirection: 'row', alignItems: 'center' },
  waitingText: { color: '#FBC02D', fontSize: 12, fontWeight: 'bold' },

  dashedDividerDetail: { height: 1, width: '100%', borderWidth: 1, borderStyle: 'dashed', borderColor: '#BDBDBD', borderRadius: 1, marginVertical: 20 },

  gridInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  gridInfoBox: { width: '48%', backgroundColor: '#13142B', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  gridTextWrap: { marginLeft: 10, flex: 1 },
  gridLabel: { color: '#AAA', fontSize: 10, marginBottom: 2 },
  gridValue: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  bottomBanner: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1C1514', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#332927' },
  bannerSubText: { color: '#FBC02D', fontSize: 10 },
  bannerMainText: { color: '#FBC02D', fontSize: 18, fontWeight: 'bold' },
  bannerDateText: { color: '#AAA', fontSize: 12, marginRight: 5 }
});