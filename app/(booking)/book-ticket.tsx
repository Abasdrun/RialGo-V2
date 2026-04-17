import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../supabase';

export default function BookTicketScreen() {
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [origin, setOrigin] = useState('เลือกสถานีต้นทาง');
  const [destination, setDestination] = useState('เลือกสถานีปลายทาง');
  const [departureDate, setDepartureDate] = useState('เลือกวันเดินทาง');
  const [returnDate, setReturnDate] = useState('เลือกวันกลับ');
  
  const [passengers, setPassengers] = useState({ adult: 1, child: 0, infant: 0 });

  const [trainType, setTrainType] = useState('รถด่วนพิเศษ');
  const [cabinClass, setCabinClass] = useState('ตู้นอนปรับอากาศ ชั้น 2');
  const [cabinNumber, setCabinNumber] = useState('1');

  const [stations, setStations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStations, setLoadingStations] = useState(false);
  const [selectingType, setSelectingType] = useState<'origin' | 'destination'>('origin');

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // 🆕 State สำหรับ Modern Alert
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });

  const [depMonthOffset, setDepMonthOffset] = useState(0);
  const [retMonthOffset, setRetMonthOffset] = useState(0);

  const [recentStations, setRecentStations] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('ทั้งหมด');

  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    setLoadingStations(true);
    const { data } = await supabase.from('stations').select('*').order('km', { ascending: true });
    if (data) setStations(data);
    setLoadingStations(false);
  };

  // 🆕 ฟังก์ชันเรียกใช้ Alert แบบใหม่
  const showAlert = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  const getCabinOptions = () => {
    return trainType === 'รถด่วนพิเศษ' 
      ? ['ตู้นอนปรับอากาศ ชั้น 2', 'ตู้นอนปรับอากาศ ชั้น 2 สำหรับผู้พิการ/วีลแชร์', 'ตู้นอนปรับอากาศ ชั้น 1']
      : ['ตู้นั่งพัดลม ชั้น 3', 'ตู้นั่งปรับอากาศ / พัดลม ชั้น 2', 'ตู้นอนปรับอากาศ ชั้น 2'];
  };

  const getNumberOptions = () => {
    if (trainType === 'รถด่วนพิเศษ') {
      if (cabinClass === 'ตู้นอนปรับอากาศ ชั้น 2') return [1, 2, 3, 4, 5, 7, 8, 9, 10];
      if (cabinClass.includes('วีลแชร์')) return [6];
      return [11];
    } else {
      if (cabinClass === 'ตู้นั่งพัดลม ชั้น 3') return [5, 6, 7, 8, 9, 10, 11];
      if (cabinClass.includes('นั่งปรับอากาศ')) return [3, 4];
      return [1, 2];
    }
  };

  const getSingleMonthData = (offset: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const mIdx = date.getMonth();
    const year = date.getFullYear() + 543;
    const days = new Date(date.getFullYear(), mIdx + 1, 0).getDate();
    const start = date.getDay();
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    
    return {
      title: `${monthNames[mIdx]} ${year}`,
      days: Array.from({length: days}, (_, j) => j + 1),
      empty: Array.from({length: start}, (_, k) => k)
    };
  };

  const updatePassenger = (type: 'adult' | 'child' | 'infant', operation: 'add' | 'sub') => {
    setPassengers(prev => {
      const newVal = operation === 'add' ? prev[type] + 1 : prev[type] - 1;
      if (type === 'adult' && newVal < 1) return prev; 
      if (newVal < 0) return prev;
      return { ...prev, [type]: newVal };
    });
  };

  const getPopupIconStyle = (text: string, isNumber = false) => {
    if (isNumber) return { bg: '#F9E8B6', color: '#FBC02D', icon: 'train-outline' };
    if (text.includes('ด่วนพิเศษ') || text.includes('ชั้น 1')) return { bg: '#EBE4FF', color: '#5E35B1', icon: 'train' };
    if (text.includes('รถเร็ว') || text.includes('พัดลม')) return { bg: '#D4F1E5', color: '#4CAF50', icon: 'train' };
    if (text.includes('ปรับอากาศ')) return { bg: '#D4F1E5', color: '#4CAF50', icon: 'train' };
    return { bg: '#F5F5F5', color: '#757575', icon: 'train' }; 
  };

  // 🛡️ แก้ไขตรงนี้: เพิ่มเคส ตะวันออก และ ตะวันตก
  const getStationStyle = (item: any) => {
    const region = item.region || ''; 
    if (region === 'ใต้') return { bg: '#FCE4EC', iconColor: '#E91E63', badgeText: 'สายใต้', badgeBg: '#E8F5E9', badgeTextColor: '#4CAF50' };
    if (region === 'เหนือ') return { bg: '#E0E0E0', iconColor: '#757575', badgeText: 'สายเหนือ', badgeBg: '#BDBDBD', badgeTextColor: '#333' };
    if (region === 'อีสาน') return { bg: '#EDE7F6', iconColor: '#5E35B1', badgeText: 'สายตะวันออกเฉียงเหนือ', badgeBg: '#D1C4E9', badgeTextColor: '#5E35B1' };
    if (region === 'กลาง') return { bg: '#FFF3E0', iconColor: '#FF9800', badgeText: 'สายกลาง', badgeBg: '#FFE0B2', badgeTextColor: '#FF9800' };
    
    // 🚩 เพิ่ม 2 ภาคนี้เพื่อให้ป้ายขึ้น
    if (region === 'ตะวันออก') return { bg: '#FFF9C4', iconColor: '#FBC02D', badgeText: 'สายตะวันออก', badgeBg: '#FFFDE7', badgeTextColor: '#FBC02D' };
    if (region === 'ตะวันตก') return { bg: '#FBE9E7', iconColor: '#FF5722', badgeText: 'สายตะวันตก', badgeBg: '#FFEBEE', badgeTextColor: '#FF5722' };
    
    return { bg: '#D1C4E9', iconColor: '#5E35B1', badgeText: '', badgeBg: 'transparent', badgeTextColor: 'transparent' };
  };

  const handleSelectStation = (item: any) => {
    if (selectingType === 'origin' && item.station_name === destination) {
      showAlert('แจ้งเตือน', 'ไม่สามารถเลือกสถานีต้นทางและปลายทางซ้ำกันได้ครับ');
      return;
    }
    if (selectingType === 'destination' && item.station_name === origin) {
      showAlert('แจ้งเตือน', 'ไม่สามารถเลือกสถานีต้นทางและปลายทางซ้ำกันได้ครับ');
      return;
    }

    if (selectingType === 'origin') setOrigin(item.station_name);
    else setDestination(item.station_name);

    setRecentStations(prev => {
      const filtered = prev.filter(s => s.id !== item.id);
      return [item, ...filtered].slice(0, 3); 
    });

    setActiveModal(null);
    setSearchQuery('');
    setSelectedRegion('ทั้งหมด'); 
  };

  const handleSearchSubmit = () => {
    if (origin.includes('เลือก') || destination.includes('เลือก')) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณาเลือกสถานีต้นทาง และสถานีปลายทางให้เรียบร้อยครับ');
      return;
    }
    if (departureDate.includes('เลือก')) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณาเลือกวันเดินทางให้เรียบร้อยครับ');
      return;
    }
    if (tripType === 'round-trip' && returnDate.includes('เลือก')) {
      showAlert('กรอกข้อมูลไม่ครบ', 'คุณเลือกแบบไป-กลับ กรุณาระบุวันกลับให้เรียบร้อยครับ');
      return;
    }

    const newSearch = { origin, destination, date: departureDate };
    setRecentSearches(prev => {
      const filtered = prev.filter(s => !(s.origin === origin && s.destination === destination));
      return [newSearch, ...filtered].slice(0, 5); 
    });

    router.push({
      pathname: '/(booking)/search-results',
      params: { 
        origin, destination, departureDate, trainType, cabinClass, cabinNumber, 
        adults: passengers.adult, children: passengers.child, infants: passengers.infant 
      }
    });
  };

  const renderCalendarCard = (type: 'dep' | 'ret') => {
    const isRet = type === 'ret';
    const isDisabled = isRet && tripType === 'one-way'; 
    const offset = isRet ? retMonthOffset : depMonthOffset;
    const setOffset = isRet ? setRetMonthOffset : setDepMonthOffset;
    const monthData = getSingleMonthData(offset);

    return (
      <View style={[styles.calendarCard, isDisabled && {opacity: 0.4}]}>
        <View style={styles.calendarHeaderRow}>
          <View>
            <Text style={styles.calendarMonthText}>{monthData.title}</Text>
            <Text style={styles.calendarSubText}>{isRet ? 'เลือกวันกลับ' : 'เลือกวันไป'}</Text>
          </View>
          <View style={styles.calendarArrows}>
            <TouchableOpacity onPress={() => setOffset(offset - 1)} style={styles.calArrowBox}>
              <Ionicons name="chevron-back" size={16} color="#BDBDBD" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOffset(offset + 1)} style={styles.calArrowBox}>
              <Ionicons name="chevron-forward" size={16} color="#757575" />
            </TouchableOpacity>
          </View>
        </View>

        <View pointerEvents={isDisabled ? 'none' : 'auto'} style={styles.daysGrid}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, idx) => (
            <Text key={d} style={[styles.dayHead, (idx === 0 || idx === 6) && {color: '#E91E63'}]}>{d}</Text>
          ))}
          {monthData.empty.map(i => <View key={`e-${i}`} style={styles.dayCell} />)}
          {monthData.days.map((day, idx) => {
            const dayOfWeek = (monthData.empty.length + idx) % 7;
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; 
            const dateStr = `${day} ${monthData.title}`;
            const isSelected = isRet ? returnDate === dateStr : departureDate === dateStr;

            return (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayCell, isSelected && styles.dayCellSelected]} 
                onPress={() => { 
                  if(isRet) setReturnDate(dateStr); 
                  else setDepartureDate(dateStr); 
                }}
              >
                <Text style={[styles.dayText, isWeekend && {color: '#E91E63'}, isSelected && {color: '#FFF'}]}>{day}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    );
  };

  // 🛡️ เพิ่ม สายตะวันออก/ตก ในตัวกรอง
  const regionFilters = [
    { id: 'ทั้งหมด', label: 'ทั้งหมด' },
    { id: 'กลาง', label: 'สายกลาง' },
    { id: 'เหนือ', label: 'สายเหนือ' },
    { id: 'อีสาน', label: 'สายตะวันออกเฉียงเหนือ' },
    { id: 'ใต้', label: 'สายใต้' },
    { id: 'ตะวันออก', label: 'สายตะวันออก' },
    { id: 'ตะวันตก', label: 'สายตะวันตก' },
  ];

  const filteredAllStations = stations.filter(s => {
    const matchSearch = s.station_name.includes(searchQuery) || (s.province && s.province.includes(searchQuery));
    const matchRegion = selectedRegion === 'ทั้งหมด' || s.region === selectedRegion;
    return matchSearch && matchRegion;
  });

  return (
    <View style={styles.mainContainer}>
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnCircle}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Book Ticket</Text>
            <View style={{width: 40}} />
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, tripType === 'one-way' && styles.tabActive]} onPress={() => setTripType('one-way')}>
              <Text style={[styles.tabText, tripType === 'one-way' && styles.tabTextActive]}>เที่ยวเดียว</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tripType === 'round-trip' && styles.tabActive]} onPress={() => setTripType('round-trip')}>
              <Text style={[styles.tabText, tripType === 'round-trip' && styles.tabTextActive]}>ไปกลับ</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เส้นทาง</Text>
          <View style={styles.routeBox}>
            <View style={styles.routeTimeline}>
              <View style={styles.dotOrigin} />
              <View style={styles.lineVertical} />
              <View style={styles.dotDestination} />
            </View>
            <View style={{flex: 1}}>
              <TouchableOpacity style={styles.stationInput} onPress={() => { setSelectingType('origin'); setActiveModal('station'); }}>
                <Text style={styles.inputLabelSmall}>ต้นทาง</Text>
                <Text style={[styles.stationValue, origin.includes('เลือก') && {color: '#9E9E9E'}]}>{origin}</Text>
              </TouchableOpacity>
              <View style={styles.dividerLine} />
              <TouchableOpacity style={styles.stationInput} onPress={() => { setSelectingType('destination'); setActiveModal('station'); }}>
                <Text style={styles.inputLabelSmall}>ปลายทาง</Text>
                <Text style={[styles.stationValue, destination.includes('เลือก') && {color: '#9E9E9E'}]}>{destination}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.swapBtn} onPress={() => {const t=origin; setOrigin(destination); setDestination(t);}}>
              <Ionicons name="sync" size={20} color="#5E35B1" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateBox} onPress={() => setActiveModal('calendar')}>
              <View style={styles.dateTitleRow}>
                <Ionicons name="calendar-outline" size={14} color="#757575" />
                <Text style={styles.inputLabelSmall}>วันไป</Text>
              </View>
              <Text style={[styles.dateValue, departureDate.includes('เลือก') && {color: '#9E9E9E'}]}>{departureDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateBox, tripType === 'one-way' && styles.dateBoxDisabled]} 
              onPress={() => setActiveModal('calendar')} 
              disabled={tripType === 'one-way'}
            >
              <View style={styles.dateTitleRow}>
                <Ionicons name="calendar-outline" size={14} color={tripType === 'one-way' ? '#BDBDBD' : '#757575'} />
                <Text style={[styles.inputLabelSmall, tripType === 'one-way' && {color: '#BDBDBD'}]}>วันกลับ</Text>
              </View>
              <Text style={[styles.dateValue, (returnDate.includes('เลือก') || tripType === 'one-way') && {color: '#BDBDBD'}]}>
                {tripType === 'one-way' ? 'เลือกวันกลับ' : returnDate}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>จำนวนผู้โดยสาร</Text>
          <View style={styles.passengerRow}>
            <View style={[styles.iconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="person" size={20} color="#5E35B1" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>ผู้ใหญ่</Text>
              <Text style={styles.passengerSub}>อายุ 12 ปีขึ้นไป</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('adult', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.adult}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('adult', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.passengerRow}>
            <View style={[styles.iconBox, {backgroundColor: '#D4F1E5'}]}><Ionicons name="happy" size={20} color="#4CAF50" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>เด็ก</Text>
              <Text style={styles.passengerSub}>อายุ 3-11 ปี</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('child', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.child}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('child', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={[styles.passengerRow, {borderBottomWidth: 0, paddingBottom: 0}]}>
            <View style={[styles.iconBox, {backgroundColor: '#F9E8B6'}]}><MaterialCommunityIcons name="human-cane" size={20} color="#FBC02D" /></View>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerType}>ผู้สูงอายุ</Text>
              <Text style={styles.passengerSub}>อายุ 60 ปีขึ้นไป</Text>
            </View>
            <View style={styles.counterGroup}>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('infant', 'sub')}><Text style={styles.countBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.countValue}>{passengers.infant}</Text>
              <TouchableOpacity style={styles.countBtn} onPress={() => updatePassenger('infant', 'add')}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ชั้นและตู้โดยสาร</Text>
          <TouchableOpacity style={styles.optionRow} onPress={() => setActiveModal('trainType')}>
            <View style={[styles.iconBox, {backgroundColor: '#EBE4FF'}]}><Ionicons name="train" size={20} color="#5E35B1" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>ชั้นโดยสาร</Text>
              <Text style={styles.optionValue}>{trainType}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => setActiveModal('cabinClass')}>
            <View style={[styles.iconBox, {backgroundColor: '#D4F1E5'}]}><MaterialCommunityIcons name="ticket-confirmation" size={20} color="#4CAF50" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>ประเภทตู้</Text>
              <Text style={styles.optionValue} numberOfLines={1}>{cabinClass}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.optionRow, {borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0}]} onPress={() => setActiveModal('cabinNumber')}>
            <View style={[styles.iconBox, {backgroundColor: '#F9E8B6'}]}><Ionicons name="train-outline" size={20} color="#FBC02D" /></View>
            <View style={styles.optionInfo}>
              <Text style={styles.inputLabelSmall}>เลขตู้ขบวน</Text>
              <Text style={styles.optionValue}>ตู้ที่ {cabinNumber}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {recentSearches.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="search" size={20} color="#333" />
                <Text style={styles.recentTitle}> การค้นหาล่าสุด</Text>
              </View>
              <TouchableOpacity onPress={() => setRecentSearches([])}><Text style={styles.seeAllText}>ล้างประวัติ</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 20}}>
              {recentSearches.map((item, index) => (
                <TouchableOpacity 
                  key={index} style={styles.recentCard}
                  onPress={() => { setOrigin(item.origin); setDestination(item.destination); setDepartureDate(item.date); }}
                >
                  <Text style={styles.recentCityText} numberOfLines={1}>{item.origin}</Text>
                  <Ionicons name="arrow-down" size={14} color="#757575" style={{marginVertical: 2}} />
                  <Text style={styles.recentCityText} numberOfLines={1}>{item.destination}</Text>
                  <Text style={styles.recentDateText}>{item.date}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomSearchContainer}>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
          <Ionicons name="search" size={20} color="#FFF" style={{marginRight: 10}} />
          <Text style={styles.searchBtnText}>ค้นหาเที่ยว</Text>
        </TouchableOpacity>
      </View>

      {/* 🆕 Modern Alert Modal */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}>
              <Ionicons name="warning" size={32} color="#FF9800" />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <TouchableOpacity 
              style={styles.alertConfirmBtn} 
              onPress={() => setAlertConfig({ ...alertConfig, visible: false })}
            >
              <Text style={styles.alertConfirmBtnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'station'} animationType="slide">
        <View style={styles.mainContainer}>
          <View style={styles.stationModalHeaderBg}>
            <View style={styles.headerGraphicCircle} />
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => { setActiveModal(null); setSearchQuery(''); setSelectedRegion('ทั้งหมด'); }} style={styles.backBtnCircle}>
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>เลือกสถานี</Text>
                <View style={{width: 40}} />
              </View>
              <View style={styles.stationModalSearchBox}>
                <Ionicons name="search" size={20} color="#333" />
                <TextInput style={styles.modalSearchInput} placeholder="ค้นหาสถานี..." placeholderTextColor="#9E9E9E" onChangeText={setSearchQuery} value={searchQuery}/>
              </View>
            </SafeAreaView>
          </View>
          <ScrollView contentContainerStyle={styles.stationModalScroll} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 15 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {regionFilters.map((r) => (
                  <TouchableOpacity key={r.id} style={[styles.regionFilterChip, selectedRegion === r.id && styles.regionFilterChipActive]} onPress={() => setSelectedRegion(r.id)}>
                    <Text style={[styles.regionFilterText, selectedRegion === r.id && styles.regionFilterTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {searchQuery === '' && selectedRegion === 'ทั้งหมด' && recentStations.length > 0 && (
              <View style={styles.recentStationSection}>
                <Text style={styles.sectionHeaderLabel}>เพิ่งค้นหา</Text>
                {recentStations.map((item, index) => {
                  const sStyle = getStationStyle(item);
                  return (
                    <TouchableOpacity key={`recent-${index}`} style={styles.recentStationItem} onPress={() => handleSelectStation(item)}>
                      <View style={[styles.stationIconBox, { backgroundColor: sStyle.bg }]}>
                        <Ionicons name="train" size={20} color={sStyle.iconColor} />
                      </View>
                      <View style={styles.stationTextWrapper}>
                        <Text style={styles.stationNameText}>{item.station_name}</Text>
                        <Text style={styles.stationSubText}>{item.province} {sStyle.badgeText ? `• ${sStyle.badgeText}` : ''}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
            <Text style={[styles.sectionHeaderLabel, {marginTop: (searchQuery || selectedRegion !== 'ทั้งหมด') ? 0 : 10}]}>
              {searchQuery || selectedRegion !== 'ทั้งหมด' ? 'ผลการค้นหา' : 'สถานีทั้งหมด'}
            </Text>
            <View style={styles.allStationsCard}>
              {filteredAllStations.map((item, index, arr) => {
                const sStyle = getStationStyle(item);
                const isLast = index === arr.length - 1;
                return (
                  <TouchableOpacity key={item.id} style={[styles.allStationItem, isLast && {borderBottomWidth: 0}]} onPress={() => handleSelectStation(item)}>
                    <View style={[styles.stationIconBox, { backgroundColor: sStyle.bg }]}>
                      <Ionicons name="train" size={20} color={sStyle.iconColor} />
                    </View>
                    <View style={styles.stationTextWrapper}>
                      <Text style={styles.stationNameText}>{item.station_name}</Text>
                      <Text style={styles.stationSubText}>{item.province} {sStyle.badgeText ? `• ${sStyle.badgeText}` : ''}</Text>
                    </View>
                    {sStyle.badgeText ? (
                      <View style={[styles.lineBadge, {backgroundColor: sStyle.badgeBg}]}>
                        <Text style={[styles.lineBadgeText, {color: sStyle.badgeTextColor}]}>{sStyle.badgeText}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                )
              })}
              {filteredAllStations.length === 0 && <Text style={{textAlign: 'center', color: '#9E9E9E', marginVertical: 20}}>ไม่พบสถานีที่ค้นหา</Text>}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={activeModal === 'calendar'} animationType="slide">
        <View style={styles.mainContainer}>
          <View style={styles.blueHeaderBg}>
            <View style={styles.headerGraphicCircle} />
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
              <View style={styles.headerTopRow}>
                <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.backBtnCircle}>
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>เลือกวันที่</Text>
                <View style={{width: 40}} />
              </View>
            </SafeAreaView>
          </View>
          <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100, marginTop: -30}} showsVerticalScrollIndicator={false}>
            {renderCalendarCard('dep')}
            {renderCalendarCard('ret')}
          </ScrollView>
          <View style={styles.bottomSearchContainer}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => setActiveModal(null)}>
              <Ionicons name="checkmark" size={20} color="#FFF" style={{marginRight: 10}} />
              <Text style={styles.searchBtnText}>ยืนยันวัน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'trainType' || activeModal === 'cabinClass'} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{flex:1}} onPress={() => setActiveModal(null)} />
          <View style={styles.whiteSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitleLeft}>{activeModal === 'trainType' ? 'ชั้นโดยสาร' : 'ประเภทตู้โดยสาร'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(activeModal === 'trainType' ? ['รถเร็ว', 'รถด่วนพิเศษ'] : getCabinOptions()).map(opt => {
                const isSelected = activeModal === 'trainType' ? trainType === opt : cabinClass === opt;
                const styleData = getPopupIconStyle(opt); 
                return (
                  <TouchableOpacity 
                    key={opt} style={styles.sheetOptionRow} 
                    onPress={() => { 
                      if(activeModal === 'trainType') { 
                        setTrainType(opt); 
                        setCabinClass(opt==='รถเร็ว' ? 'ตู้นั่งพัดลม ชั้น 3' : 'ตู้นอนปรับอากาศ ชั้น 2'); 
                      } else { setCabinClass(opt); } setActiveModal(null); 
                    }}
                  >
                    <View style={[styles.sheetIconBox, {backgroundColor: styleData.bg}]}>
                      <Ionicons name={styleData.icon as any} size={20} color={styleData.color} />
                    </View>
                    <Text style={styles.sheetOptionText}>{opt}</Text>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={activeModal === 'cabinNumber'} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{flex:1}} onPress={() => setActiveModal(null)} />
          <View style={styles.whiteSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitleLeft}>เลขตู้ขบวน</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {getNumberOptions().map(num => {
                const isSelected = cabinNumber === num.toString();
                const styleData = getPopupIconStyle('', true); 
                return (
                  <TouchableOpacity key={num} style={styles.sheetOptionRow} onPress={() => { setCabinNumber(num.toString()); setActiveModal(null); }}>
                    <View style={[styles.sheetIconBox, {backgroundColor: styleData.bg}]}>
                      <Ionicons name={styleData.icon as any} size={20} color={styleData.color} />
                    </View>
                    <Text style={styles.sheetOptionText}>ตู้ที่ {num}</Text>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  blueHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 50, overflow: 'hidden' },
  headerGraphicCircle: { position: 'absolute', right: -50, top: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#2E3166' },
  headerSafeArea: { paddingHorizontal: 20, paddingTop: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  backBtnCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 30, padding: 5, elevation: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 25 },
  tabActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 3 },
  tabText: { color: '#D1C4E9', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#262956' },
  scrollContent: { padding: 20, paddingBottom: 100, marginTop: -30 }, 
  card: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#757575', marginBottom: 15 },
  routeBox: { borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', position: 'relative', marginBottom: 15 },
  routeTimeline: { alignItems: 'center', marginRight: 15 },
  dotOrigin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5E35B1' },
  lineVertical: { width: 2, height: 40, backgroundColor: '#E0E0E0', marginVertical: 2 },
  dotDestination: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#5E35B1', backgroundColor: '#FFF' },
  stationInput: { paddingVertical: 5 },
  inputLabelSmall: { fontSize: 10, color: '#9E9E9E', marginBottom: 2 },
  stationValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dividerLine: { height: 1, backgroundColor: '#EEEEEE', marginVertical: 10 },
  swapBtn: { position: 'absolute', right: 15, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F2FF', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateBox: { flex: 1, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 15, padding: 15, marginRight: 5 },
  dateBoxDisabled: { backgroundColor: '#FAFAFA' },
  dateTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dateValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  passengerInfo: { flex: 1 },
  passengerType: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  passengerSub: { fontSize: 11, color: '#9E9E9E' },
  counterGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 5, paddingVertical: 5 },
  countBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  countBtnText: { fontSize: 16, fontWeight: 'bold', color: '#757575' },
  countValue: { width: 30, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  optionInfo: { flex: 1 },
  optionValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  recentSection: { marginTop: 10, paddingHorizontal: 5 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  recentTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  seeAllText: { color: '#5E35B1', fontSize: 12, fontWeight: 'bold' },
  recentCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginRight: 15, width: 120, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  recentCityText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  recentDateText: { fontSize: 10, color: '#9E9E9E', marginTop: 8 },
  bottomSearchContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  searchBtn: { backgroundColor: '#4A41A3', flexDirection: 'row', height: 55, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#4A41A3', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  searchBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  whiteSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: 350, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitleLeft: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 25 },
  sheetOptionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sheetIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sheetOptionText: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  radioCircleSelected: { borderColor: '#5E35B1' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#5E35B1' },
  calendarCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 25, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#EEEEEE' },
  calendarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarMonthText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  calendarSubText: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  calendarArrows: { flexDirection: 'row' },
  calArrowBox: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHead: { width: '14.28%', textAlign: 'center', color: '#757575', fontSize: 12, marginBottom: 10 },
  dayCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  dayCellSelected: { backgroundColor: '#5E35B1', borderRadius: 15 },
  dayText: { fontSize: 14, color: '#333', fontWeight: '500' },
  stationModalHeaderBg: { backgroundColor: '#262956', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 30, overflow: 'hidden' },
  stationModalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, marginHorizontal: 20, paddingHorizontal: 15, height: 50, marginTop: 10 },
  modalSearchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#333' },
  stationModalScroll: { padding: 20, paddingBottom: 50 },
  sectionHeaderLabel: { fontSize: 12, color: '#9E9E9E', marginBottom: 10, marginLeft: 5 },
  regionFilterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F5', marginRight: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  regionFilterChipActive: { backgroundColor: '#262956', borderColor: '#262956' },
  regionFilterText: { fontSize: 12, color: '#757575', fontWeight: 'bold' },
  regionFilterTextActive: { color: '#FFF' },
  recentStationSection: { marginBottom: 20 },
  recentStationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  allStationsCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 10, borderWidth: 1, borderColor: '#EEEEEE', elevation: 1 },
  allStationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  stationIconBox: { width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stationTextWrapper: { flex: 1, justifyContent: 'center' },
  stationNameText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  stationSubText: { fontSize: 12, color: '#9E9E9E' },
  lineBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  lineBadgeText: { fontSize: 10, fontWeight: 'bold' },

  /* 🆕 Modern Alert Styles */
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  alertBox: { width: '100%', backgroundColor: '#FFF', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  alertIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF9C4', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 5, borderColor: '#FFF', marginTop: -60, elevation: 5 },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 16, color: '#757575', textAlign: 'center', lineHeight: 22, marginBottom: 25, paddingHorizontal: 10 },
  alertConfirmBtn: { backgroundColor: '#262956', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 20, width: '100%', alignItems: 'center' },
  alertConfirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});