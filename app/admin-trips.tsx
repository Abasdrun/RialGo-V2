import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../supabase';

export default function AdminTripsScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 States สำหรับ Modal ฟอร์มเพิ่มรอบรถ
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectingStation, setSelectingStation] = useState<'origin' | 'dest' | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // 📌 เพิ่ม State ค้นหาสถานี

  // ข้อมูลฟอร์ม
  const [trainNumber, setTrainNumber] = useState('');
  const [trainType, setTrainType] = useState('รถด่วนพิเศษ');
  const [originId, setOriginId] = useState<number | null>(null);
  const [originName, setOriginName] = useState('เลือกต้นทาง');
  const [destId, setDestId] = useState<number | null>(null);
  const [destName, setDestName] = useState('เลือกปลายทาง');
  const [depTime, setDepTime] = useState('06:00');
  const [arrTime, setArrTime] = useState('12:00');
  const [depDate, setDepDate] = useState('');
  const [seats, setSeats] = useState('120');
  const [status, setStatus] = useState('Scheduled');

  useEffect(() => {
    fetchTrips();
    fetchStations();
    
    // เซ็ตวันที่เริ่มต้นเป็นวันนี้
    const today = new Date();
    setDepDate(today.toISOString().split('T')[0]);
  }, []);

  // 📥 1. ดึงรอบรถ
  const fetchTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select(`
        id, departure_date, available_seats, status,
        trains (
          id, train_number, type, departure_time, arrival_time,
          origin:origin_station_id(station_name),
          dest:destination_station_id(station_name)
        )
      `)
      .order('departure_date', { ascending: false });

    if (data) setTrips(data);
    setLoading(false);
  };

  // 🚉 2. ดึงสถานีทั้งหมดเพื่อเอามาเข้าลิสต์ค้นหา (ดึง province มาด้วยเพื่อโชว์สวยๆ)
  const fetchStations = async () => {
    const { data } = await supabase.from('stations').select('*').order('km', { ascending: true });
    if (data) setStations(data);
  };

  // 💾 3. ฟังก์ชันบันทึกรอบรถ
  const handleAddTrip = async () => {
    if (!trainNumber || !originId || !destId || !depTime || !arrTime || !depDate) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง!');
      return;
    }

    try {
      setLoading(true);
      // สเตป 1: สร้างขบวนรถ (trains)
      const { data: newTrain, error: trainErr } = await supabase.from('trains').insert({
        train_number: trainNumber,
        type: trainType,
        departure_time: depTime,
        arrival_time: arrTime,
        origin_station_id: originId,
        destination_station_id: destId
      }).select().single();

      if (trainErr) throw trainErr;

      // สเตป 2: สร้างรอบเดินทาง (trips)
      const { error: tripErr } = await supabase.from('trips').insert({
        train_id: newTrain.id,
        departure_date: depDate,
        available_seats: parseInt(seats),
        status: status
      });

      if (tripErr) throw tripErr;

      Alert.alert('สำเร็จ!', 'เพิ่มรอบรถไฟเรียบร้อยแล้ว!');
      setModalVisible(false);
      resetForm();
      fetchTrips();

    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTrainNumber('');
    setOriginId(null); setOriginName('เลือกต้นทาง');
    setDestId(null); setDestName('เลือกปลายทาง');
  };

  // 🗑️ 4. ฟังก์ชันลบ
  const handleDeleteTrip = (id: number, trainId: number) => {
    Alert.alert('ยืนยันการลบ', 'ลบแล้วข้อมูลจะหายไปจากระบบทันที แน่ใจหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ลบเลย', 
        style: 'destructive',
        onPress: async () => {
          await supabase.from('trips').delete().eq('id', id);
          await supabase.from('trains').delete().eq('id', trainId);
          fetchTrips();
        }
      }
    ]);
  };

  const renderTripCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.departure_date}</Text></View>
        <View style={[styles.statusBadge, item.status === 'Cancelled' && {backgroundColor: '#FFEBEE'}]}>
          <Text style={[styles.statusText, item.status === 'Cancelled' && {color: '#D32F2F'}]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={{flex: 1}}>
          <Text style={styles.trainName}>
            {item.trains?.origin?.station_name || 'ไม่ระบุ'} ➔ {item.trains?.dest?.station_name || 'ไม่ระบุ'}
          </Text>
          <Text style={styles.trainSub}>
            ขบวน {item.trains?.train_number} ({item.trains?.type})
          </Text>
          <Text style={styles.timeText}>เวลา: {item.trains?.departure_time?.substring(0,5)} - {item.trains?.arrival_time?.substring(0,5)}</Text>
          <Text style={styles.seatText}>ที่นั่งว่าง: {item.available_seats}</Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTrip(item.id, item.trains?.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 👑 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการรอบรถ (Trips)</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF9800" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={renderTripCard}
          ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีข้อมูลรอบรถในระบบ</Text>}
        />
      )}

      {/* 📝 Modal ฟอร์มหลัก */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* 📍 ถ้ากำลังเลือกสถานี ให้โชว์หน้าค้นหาสถานีแบบจัดเต็ม! */}
            {selectingStation ? (
              <View style={{flex: 1}}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => {setSelectingStation(null); setSearchQuery('');}}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.modalSearchBox}>
                    <Ionicons name="search" size={20} color="#9E9E9E" />
                    <TextInput 
                      style={styles.modalSearchInput} 
                      placeholder={`ค้นหา${selectingStation === 'origin' ? 'ต้นทาง' : 'ปลายทาง'}...`} 
                      placeholderTextColor="#9E9E9E" 
                      onChangeText={setSearchQuery} 
                      autoFocus
                    />
                  </View>
                </View>

                {/* Timeline UI ดึงมาจาก book-ticket แต่งให้เข้ากับ Dark Mode */}
                <View style={styles.timelineWrapper}>
                  <View style={styles.blackLine} />
                  <FlatList 
                    data={stations.filter(s => s.station_name.includes(searchQuery) || (s.province && s.province.includes(searchQuery)))}
                    keyExtractor={(s) => s.id.toString()}
                    showsVerticalScrollIndicator={false}
                    renderItem={({item}) => (
                      <TouchableOpacity style={styles.timelineItem} onPress={() => {
                        if (selectingStation === 'origin') { setOriginId(item.id); setOriginName(item.station_name); }
                        else { setDestId(item.id); setDestName(item.station_name); }
                        setSelectingStation(null);
                        setSearchQuery(''); // รีเซ็ตคำค้นหา
                      }}>
                        <View style={styles.nodeWrapper}>
                          <View style={styles.nodeBox}><Ionicons name="train" size={16} color="#5E35B1" /></View>
                          <View style={styles.nodeLink} />
                        </View>
                        <View style={{marginLeft: 25}}>
                          <Text style={{color: '#FFF', fontSize: 16, fontWeight: 'bold'}}>{item.station_name}</Text>
                          <Text style={{color: '#AAA', fontSize: 12, marginTop: 2}}>{item.province}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            ) : (
              /* 📝 ถ้าไม่ได้เลือกสถานี ให้โชว์ฟอร์มกรอกข้อมูลตามปกติ */
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>สร้างรอบรถใหม่</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
                </View>

                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>ขบวนที่ (เช่น 9)</Text>
                    <TextInput style={styles.input} value={trainNumber} onChangeText={setTrainNumber} placeholderTextColor="#9E9E9E" keyboardType="number-pad"/>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>วันที่ (YYYY-MM-DD)</Text>
                    <TextInput style={styles.input} value={depDate} onChangeText={setDepDate} placeholderTextColor="#9E9E9E" />
                  </View>
                </View>

                <Text style={styles.label}>ประเภทรถ</Text>
                <View style={{flexDirection: 'row', marginBottom: 15}}>
                  {['รถเร็ว', 'รถด่วนพิเศษ'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.statusOption, trainType === t && styles.statusOptionActive]} onPress={() => setTrainType(t)}>
                      <Text style={[styles.statusOptionText, trainType === t && {color: '#FFF'}]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>เส้นทาง</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setSelectingStation('origin')}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="location-outline" size={20} color={originId ? '#4CAF50' : '#9E9E9E'} style={{marginRight: 10}}/>
                    <Text style={{color: originId ? '#FFF' : '#9E9E9E', fontSize: 16}}>{originName}</Text>
                  </View>
                </TouchableOpacity>
                <View style={{alignItems: 'center', marginVertical: -10, zIndex: 1}}>
                  <View style={{width: 30, height: 30, borderRadius: 15, backgroundColor: '#3A3C59', justifyContent: 'center', alignItems: 'center'}}>
                    <Ionicons name="arrow-down" size={16} color="#FFF" />
                  </View>
                </View>
                <TouchableOpacity style={styles.selectBox} onPress={() => setSelectingStation('dest')}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="location" size={20} color={destId ? '#F44336' : '#9E9E9E'} style={{marginRight: 10}}/>
                    <Text style={{color: destId ? '#FFF' : '#9E9E9E', fontSize: 16}}>{destName}</Text>
                  </View>
                </TouchableOpacity>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                  <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>เวลาออก (HH:MM)</Text>
                    <TextInput style={styles.input} value={depTime} onChangeText={setDepTime} placeholderTextColor="#9E9E9E" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.label}>เวลาถึง (HH:MM)</Text>
                    <TextInput style={styles.input} value={arrTime} onChangeText={setArrTime} placeholderTextColor="#9E9E9E" />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleAddTrip}>
                  <Text style={styles.saveBtnText}>บันทึกรอบรถ</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1E36' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  listContent: { padding: 20, paddingBottom: 100 },
  
  card: { backgroundColor: '#2A2C49', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { backgroundColor: '#5E35B1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  trainName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  trainSub: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  timeText: { color: '#FF9800', fontSize: 12, marginBottom: 4 },
  seatText: { color: '#4CAF50', fontSize: 12 },
  deleteBtn: { padding: 10, backgroundColor: 'rgba(255,82,82,0.1)', borderRadius: 10 },
  emptyText: { color: '#757575', textAlign: 'center', marginTop: 50, fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#2A2C49', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, flex: 1, marginTop: 50 }, // ให้ Modal สูงขึ้นเพื่อพอดีกับลิสต์สถานี
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  label: { color: '#AAA', fontSize: 12, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#1C1E36', color: '#FFF', height: 50, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#3A3C59', marginBottom: 5 },
  selectBox: { backgroundColor: '#1C1E36', height: 55, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#3A3C59', justifyContent: 'center' },
  
  statusOption: { flex: 1, backgroundColor: '#1C1E36', height: 45, justifyContent: 'center', alignItems: 'center', marginHorizontal: 3, borderRadius: 10, borderWidth: 1, borderColor: '#3A3C59' },
  statusOptionActive: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  statusOptionText: { color: '#AAA', fontSize: 14, fontWeight: 'bold' },

  saveBtn: { backgroundColor: '#4CAF50', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // --- Styles สำหรับหน้าค้นหาสถานี (ดึงจาก book-ticket.tsx มาปรับสี) ---
  modalSearchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1E36', borderRadius: 20, paddingHorizontal: 15, height: 45, marginLeft: 10, borderWidth: 1, borderColor: '#3A3C59' },
  modalSearchInput: { flex: 1, marginLeft: 10, color: '#FFF' },
  timelineWrapper: { flex: 1, paddingLeft: 20, marginTop: 10 },
  blackLine: { position: 'absolute', left: 35, top: 0, bottom: 0, width: 4, backgroundColor: '#5E35B1' },
  timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  nodeWrapper: { width: 36, alignItems: 'center' },
  nodeBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#1C1E36', borderWidth: 2, borderColor: '#5E35B1', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  nodeLink: { width: 15, height: 3, backgroundColor: '#5E35B1', position: 'absolute', right: -15, top: 13 },
});