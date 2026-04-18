import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../supabase";

const { width } = Dimensions.get("window");

export default function AdminTripsScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectingStation, setSelectingStation] = useState<
    "origin" | "dest" | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 🔔 Custom Notification State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // 🗑️ Custom Confirm Delete State
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteIds, setDeleteIds] = useState<{
    tripId: number;
    trainId: number;
  } | null>(null);

  const [trainType, setTrainType] = useState("รถด่วนพิเศษ");
  const [originId, setOriginId] = useState<number | null>(null);
  const [originName, setOriginName] = useState("เลือกต้นทาง");
  const [destId, setDestId] = useState<number | null>(null);
  const [destName, setDestName] = useState("เลือกปลายทาง");
  const [depTime, setDepTime] = useState("06:00");
  const [arrTime, setArrTime] = useState("12:00");
  const [depDate, setDepDate] = useState("");
  const [seats, setSeats] = useState("120");
  const [status, setStatus] = useState("Scheduled");

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
      fetchStations();
      const today = new Date();
      setDepDate(today.toISOString().split("T")[0]);
    }, []),
  );

  const showCustomAlert = (msg: string) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const fetchTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trips")
      .select(
        `
        id, departure_date, available_seats, status,
        trains ( id, type, departure_time, arrival_time, origin:origin_station_id(station_name), dest:destination_station_id(station_name) )
      `,
      )
      .order("departure_date", { ascending: false });

    if (data) setTrips(data);
    setLoading(false);
  };

  const fetchStations = async () => {
    const { data } = await supabase
      .from("stations")
      .select("*")
      .order("km", { ascending: true });
    if (data) setStations(data);
  };

  const handleAddTrip = async () => {
    if (!originId || !destId || !depTime || !arrTime || !depDate) {
      showCustomAlert("กรุณากรอกข้อมูลเส้นทางและวันเวลาให้ครบ!");
      return;
    }
    try {
      setLoading(true);
      const { data: newTrain, error: trainErr } = await supabase
        .from("trains")
        .insert({
          type: trainType,
          departure_time: depTime,
          arrival_time: arrTime,
          origin_station_id: originId,
          destination_station_id: destId,
        })
        .select()
        .single();
      if (trainErr) throw trainErr;

      await supabase.from("train_stops").insert([
        {
          train_id: newTrain.id,
          station_id: originId,
          stop_order: 1,
          departure_time: depTime,
        },
        {
          train_id: newTrain.id,
          station_id: destId,
          stop_order: 2,
          arrival_time: arrTime,
        },
      ]);

      const { error: tripErr } = await supabase.from("trips").insert({
        train_id: newTrain.id,
        departure_date: depDate,
        available_seats: parseInt(seats),
        status: status,
      });
      if (tripErr) throw tripErr;

      showCustomAlert("เพิ่มรอบรถไฟเรียบร้อยแล้ว!");
      setModalVisible(false);
      resetForm();
      fetchTrips();
    } catch (error: any) {
      showCustomAlert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOriginId(null);
    setOriginName("เลือกต้นทาง");
    setDestId(null);
    setDestName("เลือกปลายทาง");
  };

  // 🗑️ สั่งเปิด Modal ยืนยันการลบ
  const handleDeleteTrip = (tripId: number, trainId: number) => {
    setDeleteIds({ tripId, trainId });
    setConfirmVisible(true);
  };

  // 🗑️ ฟังก์ชันลบจริง
  const confirmDelete = async () => {
    if (deleteIds) {
      await supabase.from("trips").delete().eq("id", deleteIds.tripId);
      await supabase.from("trains").delete().eq("id", deleteIds.trainId);
      setConfirmVisible(false);
      setDeleteIds(null);
      fetchTrips();
    }
  };

  const getDisplayStatus = (item: any) => {
    const tripDate = new Date(item.departure_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tripDate < today)
      return { label: "สิ้นสุดการเดินทาง", bg: "#F5F5F5", color: "#9E9E9E" };
    if (item.status === "Scheduled")
      return { label: "เปิดจอง", bg: "#E8F5E9", color: "#4CAF50" };
    else if (item.status === "Full")
      return { label: "เต็มแล้ว", bg: "#FFEBEE", color: "#F44336" };
    return { label: "ปิดแล้ว", bg: "#ECEFF1", color: "#607D8B" };
  };

  const getLineBadgeStyle = (province: string) => {
    if (province === "กรุงเทพมหานคร" || province === "ปทุมธานี")
      return { bg: "#FFF3E0", text: "#FF9800", label: "สายกลาง" };
    if (
      province === "เชียงใหม่" ||
      province === "พิษณุโลก" ||
      province === "พระนครศรีอยุธยา" ||
      province === "นครสวรรค์"
    )
      return { bg: "#F5F5F5", text: "#757575", label: "สายเหนือ" };
    if (province === "นครราชสีมา")
      return { bg: "#F3E5F5", text: "#9C27B0", label: "สายตะวันออกเฉียงเหนือ" };
    return { bg: "#E8F5E9", text: "#4CAF50", label: "สายใต้" };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <View style={styles.headerCurve} />
      </View>
      <SafeAreaView edges={["top"]} style={{ zIndex: 10 }}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnCircle}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle}>จัดการรอบเที่ยว (Trips)</Text>
            <Text style={styles.headerSub}>เพิ่ม แก้ไข และลบรอบเที่ยวรถไฟ</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "flex-end", marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.addBtnMain}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>เพิ่มรอบเที่ยวใหม่</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableTh}>
            <Text style={[styles.thText, { flex: 1 }]}>วันที่</Text>
            <Text style={[styles.thText, { flex: 2.5 }]}>เส้นทาง</Text>
            <Text style={[styles.thText, { flex: 1.5, textAlign: "center" }]}>
              สถานะ
            </Text>
            <Text style={[styles.thText, { flex: 1, textAlign: "center" }]}>
              จัดการ
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#5E35B1" style={{ margin: 20 }} />
          ) : (
            <View>
              {trips.map((item) => {
                const d = new Date(item.departure_date);
                const statusUI = getDisplayStatus(item);
                return (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={styles.dateCol}>
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>
                          {d.getDate()}
                          {"\n"}
                          {
                            [
                              "ม.ค.",
                              "ก.พ.",
                              "มี.ค.",
                              "เม.ย.",
                              "พ.ค.",
                              "มิ.ย.",
                              "ก.ค.",
                              "ส.ค.",
                              "ก.ย.",
                              "ต.ค.",
                              "พ.ย.",
                              "ธ.ค.",
                            ][d.getMonth()]
                          }
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 2.5 }}>
                      <Text style={styles.routeText} numberOfLines={1}>
                        {item.trains?.origin?.station_name} ➔{" "}
                        {item.trains?.dest?.station_name}
                      </Text>
                      <Text style={styles.trainSubText}>
                        {item.trains?.type}
                      </Text>
                    </View>
                    <View style={{ flex: 1.5, alignItems: "center" }}>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: statusUI.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: statusUI.color },
                          ]}
                        >
                          {statusUI.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "center",
                      }}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteTrip(item.id, item.trains?.id)
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#F44336"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 📝 Modal ฟอร์ม */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectingStation ? (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#F4F6F9",
                  borderRadius: 30,
                  overflow: "hidden",
                }}
              >
                <View style={styles.stationHeaderContainer}>
                  <View style={styles.stationHeaderInner}>
                    <TouchableOpacity
                      onPress={() => setSelectingStation(null)}
                      style={styles.modalBackBtn}
                    >
                      <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.modalHeaderText}>เลือกสถานี</Text>
                    <View style={{ width: 40 }} />
                  </View>
                  <View style={styles.searchBarWrapper}>
                    <Ionicons
                      name="search"
                      size={20}
                      color="#9E9E9E"
                      style={{ marginLeft: 15 }}
                    />
                    <TextInput
                      placeholder="ค้นหาสถานี..."
                      style={styles.stationSearchInput}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                  </View>
                </View>
                <FlatList
                  data={stations.filter((s) =>
                    s.station_name.includes(searchQuery),
                  )}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 30,
                  }}
                  renderItem={({ item }) => {
                    const line = getLineBadgeStyle(item.province);
                    return (
                      <TouchableOpacity
                        style={styles.newStationCard}
                        onPress={() => {
                          if (selectingStation === "origin") {
                            setOriginId(item.id);
                            setOriginName(item.station_name);
                          } else {
                            setDestId(item.id);
                            setDestName(item.station_name);
                          }
                          setSelectingStation(null);
                        }}
                      >
                        <View
                          style={[
                            styles.stationIconBox,
                            { backgroundColor: line.bg },
                          ]}
                        >
                          <Ionicons name="train" size={20} color={line.text} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                          <Text style={styles.newStationTitle}>
                            {item.station_name}
                          </Text>
                          <Text style={styles.newStationSub}>
                            {item.province}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.lineBadge,
                            { backgroundColor: line.bg },
                          ]}
                        >
                          <Text
                            style={[styles.lineBadgeText, { color: line.text }]}
                          >
                            {line.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>สร้างรอบเที่ยวใหม่</Text>
                    <Text style={styles.modalSub}>
                      เลือกประเภทรถและกำหนดวันเดินทาง
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#E0E0E0" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>ประเภทรถ</Text>
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      trainType === "รถเร็ว" && styles.typeBtnActive,
                    ]}
                    onPress={() => setTrainType("รถเร็ว")}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        trainType === "รถเร็ว" && { color: "#FFF" },
                      ]}
                    >
                      รถเร็ว
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      trainType === "รถด่วนพิเศษ" && styles.typeBtnActive,
                    ]}
                    onPress={() => setTrainType("รถด่วนพิเศษ")}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        trainType === "รถด่วนพิเศษ" && { color: "#FFF" },
                      ]}
                    >
                      รถด่วนพิเศษ
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rowGrid}>
                  <View style={[styles.colHalf, { width: "100%" }]}>
                    <Text style={styles.label}>วันที่วิ่ง</Text>
                    <TextInput
                      style={styles.input}
                      value={depDate}
                      onChangeText={setDepDate}
                    />
                  </View>
                </View>

                <Text style={styles.label}>เส้นทาง</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setSelectingStation("origin")}
                >
                  <View style={styles.dotPurple} />
                  <Text style={{ color: originId ? "#333" : "#BDBDBD" }}>
                    {originName}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setSelectingStation("dest")}
                >
                  <View style={styles.dotLightPurple} />
                  <Text style={{ color: destId ? "#333" : "#BDBDBD" }}>
                    {destName}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rowGrid}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>เวลาออก</Text>
                    <TextInput
                      style={styles.input}
                      value={depTime}
                      onChangeText={setDepTime}
                    />
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>เวลาถึง</Text>
                    <TextInput
                      style={styles.input}
                      value={arrTime}
                      onChangeText={setArrTime}
                    />
                  </View>
                </View>

                <View style={styles.rowGrid}>
                  <View style={[styles.colHalf, { width: "100%" }]}>
                    <Text style={styles.label}>จำนวนที่นั่ง</Text>
                    <TextInput
                      style={styles.input}
                      value={seats}
                      onChangeText={setSeats}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleAddTrip}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>บันทึกรอบเที่ยว</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 🔔 Modern Custom Alert Modal */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={styles.alertIconBg}>
              <Ionicons name="notifications" size={30} color="#5E35B1" />
            </View>
            <Text style={styles.alertTitle}>แจ้งเตือน</Text>
            <Text style={styles.alertSub}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertConfirmBtn}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertConfirmText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🗑️ Modern Confirm Delete Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconBg, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="trash-outline" size={30} color="#F44336" />
            </View>
            <Text style={styles.alertTitle}>ยืนยันการลบ</Text>
            <Text style={styles.alertSub}>
              ลบแล้วข้อมูลจะหายไปจากระบบทันที แน่ใจหรือไม่?
            </Text>

            <View style={{ flexDirection: "row", width: "100%" }}>
              <TouchableOpacity
                style={[
                  styles.alertConfirmBtn,
                  { flex: 1, backgroundColor: "#F5F5F5", marginRight: 10 },
                ]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={[styles.alertConfirmText, { color: "#757575" }]}>
                  ยกเลิก
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.alertConfirmBtn,
                  { flex: 1, backgroundColor: "#F44336" },
                ]}
                onPress={confirmDelete}
              >
                <Text style={styles.alertConfirmText}>ลบเลย</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F9" },
  headerBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    height: 180,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerCurve: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  headerSub: { color: "#B0B2C3", fontSize: 12, marginTop: 2 },
  scrollContent: { padding: 20, paddingTop: 90, paddingBottom: 50 },
  addBtnMain: {
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },
  addBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  tableCard: {
    backgroundColor: "#FFF",
    borderRadius: 25,
    padding: 15,
    elevation: 4,
  },
  tableTh: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 10,
    marginBottom: 10,
  },
  thText: { fontSize: 10, color: "#9E9E9E", fontWeight: "bold" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F9F9F9",
    paddingVertical: 12,
  },
  dateCol: { flex: 1 },
  dateBadge: {
    backgroundColor: "#EBE4FF",
    padding: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  dateBadgeText: {
    color: "#5E35B1",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
  },
  routeText: { fontSize: 11, fontWeight: "bold", color: "#333" },
  trainSubText: { fontSize: 9, color: "#9E9E9E" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 9, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 0,
    height: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  modalSub: { fontSize: 12, color: "#9E9E9E" },
  rowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    marginTop: 15,
  },
  colHalf: { width: "48%" },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    marginLeft: 25,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 25,
    marginBottom: 10,
  },
  dotPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5E35B1",
    marginRight: 10,
  },
  dotLightPurple: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1C4E9",
    marginRight: 10,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 25,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 10,
  },
  cancelBtnText: { color: "#757575", fontWeight: "bold" },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", marginLeft: 5 },
  typeSelectorRow: {
    flexDirection: "row",
    paddingHorizontal: 25,
    marginBottom: 5,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  typeBtnActive: { backgroundColor: "#FF9800", borderColor: "#FF9800" },
  typeBtnText: { color: "#757575", fontWeight: "bold", fontSize: 14 },
  stationHeaderContainer: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 25,
  },
  stationHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeaderText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 25,
    marginTop: 20,
    borderRadius: 25,
    height: 45,
  },
  stationSearchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  newStationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 1,
  },
  stationIconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  newStationTitle: { fontSize: 15, fontWeight: "bold", color: "#333" },
  newStationSub: { fontSize: 11, color: "#9E9E9E", marginTop: 2 },
  lineBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  lineBadgeText: { fontSize: 10, fontWeight: "bold" },

  // 🔔 Common Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: width * 0.8,
    backgroundColor: "#FFF",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0E7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  alertSub: {
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  alertConfirmBtn: {
    backgroundColor: "#5E35B1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
  },
  alertConfirmText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
