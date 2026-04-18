import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  SafeAreaView as RNSafeAreaView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../supabase";

const { width, height } = Dimensions.get("window");

// โครงสร้างข้อมูลตั๋ว
interface Ticket {
  id: string;
  refCode: string;
  trainName: string;
  origin: string;
  dest: string;
  depTime: string;
  arrTime: string;
  duration: string;
  date: string;
  seat: string;
  cabin: string;
  price: number;
  status: "upcoming" | "completed" | "cancelled";
  countdown?: string;
  classType: string;
}

export default function MyTicketScreen() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">(
    "upcoming",
  );
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  // 🧮 ฟังก์ชันแยกเลขตู้ และเลขที่นั่ง
  const parseCabinAndSeats = (seatsStr: string) => {
    if (!seatsStr || seatsStr === "undefined")
      return { cabin: "-", seats: "-" };
    const seatArr = seatsStr.split(",").map((s) => s.trim());
    const cabin = seatArr[0].split("-")[0] || "-";
    const seats = seatArr.map((s) => s.split("-")[1] || s).join(", ");
    return { cabin, seats };
  };

  // 🧮 ฟังก์ชันคำนวณเวลาเดินทางจริง
  const calculateRealDuration = (dep: string, arr: string) => {
    if (!dep || !arr || dep === "00:00" || arr === "00:00") return "--ชม. --น.";
    const [dh, dm] = dep.split(":").map(Number);
    const [ah, am] = arr.split(":").map(Number);
    let mins = ah * 60 + am - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60; // วิ่งข้ามคืน
    return `${Math.floor(mins / 60)}ชม. ${mins % 60}น.`;
  };

  // 🧮 ฟังก์ชันนับถอยหลังเวลาออกเดินทาง
  const getCountdown = (depDate: string, depTime: string) => {
    if (!depDate || !depTime || depTime === "00:00") return "";
    const now = new Date();
    const depDateTime = new Date(`${depDate}T${depTime}:00`);
    const diffMs = depDateTime.getTime() - now.getTime();

    if (diffMs <= 0) return "เดินทางแล้ว";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHrs = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) return `ออกใน ${diffDays} วัน ${diffHrs} ชม.`;
    if (diffHrs > 0) return `ออกใน ${diffHrs} ชม. ${diffMins} นาที`;
    return `ออกใน ${diffMins} นาที`;
  };

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select(
            `
            id, total_price, status, selected_seats, created_at, origin_station_id, destination_station_id,
            trips ( train_id, departure_date, trains ( type, train_number ) ),
            origin:origin_station_id ( station_name ),
            dest:destination_station_id ( station_name )
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (bookings && bookings.length > 0) {
          const formattedTickets = await Promise.all(
            bookings.map(async (b: any) => {
              let exactDep = "00:00";
              let exactArr = "00:00";

              // 🚀 แก้ปัญหาโครงสร้าง trips
              const tripData = Array.isArray(b.trips) ? b.trips[0] : b.trips;

              if (
                tripData?.train_id &&
                b.origin_station_id &&
                b.destination_station_id
              ) {
                const { data: stops } = await supabase
                  .from("train_stops")
                  .select("station_id, departure_time, arrival_time")
                  .eq("train_id", tripData.train_id)
                  .in("station_id", [
                    b.origin_station_id,
                    b.destination_station_id,
                  ]);

                if (stops) {
                  // 🚀 แก้ปัญหา ID mismatch (ใช้ ==)
                  const originStop = stops.find(
                    (s) => s.station_id == b.origin_station_id,
                  );
                  const destStop = stops.find(
                    (s) => s.station_id == b.destination_station_id,
                  );

                  // ดึงเวลาที่มีอยู่มาใช้ (เผื่อต้นทางไม่มี departure หรือปลายทางไม่มี arrival)
                  if (originStop) {
                    exactDep = (
                      originStop.departure_time ||
                      originStop.arrival_time ||
                      "00:00"
                    ).substring(0, 5);
                  }
                  if (destStop) {
                    exactArr = (
                      destStop.arrival_time ||
                      destStop.departure_time ||
                      "00:00"
                    ).substring(0, 5);
                  }
                }
              }

              const { cabin, seats } = parseCabinAndSeats(b.selected_seats);
              const durationTxt = calculateRealDuration(exactDep, exactArr);
              const countdownTxt = getCountdown(
                tripData?.departure_date,
                exactDep,
              );

              let currentStatus =
                b.status === "Confirmed"
                  ? "upcoming"
                  : b.status === "Cancelled"
                    ? "cancelled"
                    : "completed";
              if (
                currentStatus === "upcoming" &&
                countdownTxt === "เดินทางแล้ว"
              ) {
                currentStatus = "completed";
              }

              return {
                id: b.id.toString(),
                refCode: `TH ${new Date(b.created_at).getFullYear()}-${String(b.id).padStart(5, "0")}`,
                trainName: `${tripData?.trains?.type || "รถด่วนพิเศษ"} ${tripData?.trains?.train_number || ""}`,
                origin: b.origin?.station_name || "ไม่ระบุ",
                dest: b.dest?.station_name || "ไม่ระบุ",
                depTime: exactDep,
                arrTime: exactArr,
                duration: durationTxt,
                date: formatThaiDate(
                  tripData?.departure_date || new Date().toISOString(),
                ),
                seat: seats,
                cabin: cabin,
                price: b.total_price,
                status: currentStatus,
                countdown: countdownTxt,
                classType:
                  tripData?.trains?.type === "รถด่วนพิเศษ"
                    ? "ชั้น 2 ปรับอากาศ"
                    : "ชั้น 3 พัดลม",
              };
            }),
          );

          setTickets(formattedTickets);
        } else {
          setTickets([]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatThaiDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = [
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
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const filteredTickets = tickets.filter((t) =>
    activeTab === "upcoming"
      ? t.status === "upcoming"
      : t.status !== "upcoming",
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return (
          <View style={[styles.statusBadge, { backgroundColor: "#F3E5F5" }]}>
            <Text style={[styles.statusBadgeText, { color: "#8E24AA" }]}>
              ที่จะมาถึง
            </Text>
          </View>
        );
      case "completed":
        return (
          <View style={[styles.statusBadge, { backgroundColor: "#EEEEEE" }]}>
            <Text style={[styles.statusBadgeText, { color: "#757575" }]}>
              เสร็จสิ้น
            </Text>
          </View>
        );
      case "cancelled":
        return (
          <View style={[styles.statusBadge, { backgroundColor: "#FFEBEE" }]}>
            <Text style={[styles.statusBadgeText, { color: "#E53935" }]}>
              ยกเลิก
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const getStatusFooter = (ticket: Ticket) => {
    switch (ticket.status) {
      case "upcoming":
        return (
          <View style={styles.footerStatusBox}>
            <Ionicons name="time-outline" size={14} color="#FBC02D" />
            <Text style={[styles.footerStatusText, { color: "#FBC02D" }]}>
              {" "}
              {ticket.countdown}
            </Text>
          </View>
        );
      case "completed":
        return (
          <View style={styles.footerStatusBox}>
            <Ionicons name="checkmark" size={14} color="#4CAF50" />
            <Text style={[styles.footerStatusText, { color: "#4CAF50" }]}>
              {" "}
              เดินทางแล้ว
            </Text>
          </View>
        );
      case "cancelled":
        return (
          <View style={styles.footerStatusBox}>
            <Ionicons name="close" size={14} color="#E53935" />
            <Text style={[styles.footerStatusText, { color: "#E53935" }]}>
              {" "}
              ถูกยกเลิก
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.blueHeaderBg}>
        <View style={styles.headerGraphicCircle} />
      </View>

      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={styles.backBtnCircle}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "upcoming" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("upcoming")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "upcoming" && styles.tabTextActive,
              ]}
            >
              ที่จะมาถึง
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "history" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.tabTextActive,
              ]}
            >
              ประวัติการเดินทาง
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#5E35B1"
            style={{ marginTop: 50 }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredTickets.map((ticket, index) => (
              <TouchableOpacity
                key={index}
                style={styles.ticketCard}
                onPress={() => setSelectedTicket(ticket)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.trainNameText}>
                      {ticket.trainName} • {ticket.dest}
                    </Text>
                    <Text style={styles.dateText}>{ticket.date}</Text>
                  </View>
                  {getStatusBadge(ticket.status)}
                </View>

                <View style={styles.routeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityText}>{ticket.origin}</Text>
                    <Text style={styles.timeText}>{ticket.depTime}</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Text style={styles.durationText}>{ticket.duration}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#BDBDBD" />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.cityText}>{ticket.dest}</Text>
                    <Text style={styles.timeText}>{ticket.arrTime}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.seatBadge}>
                    <Text style={styles.seatBadgeText}>
                      {ticket.seat} • ตู้ {ticket.cabin}
                    </Text>
                  </View>

                  {getStatusFooter(ticket)}

                  <Text style={styles.priceText}>
                    THB {ticket.price.toLocaleString("en-US")}
                  </Text>
                </View>

                <View style={styles.cutoutLeft} />
                <View style={styles.cutoutRight} />
              </TouchableOpacity>
            ))}

            {filteredTickets.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="ticket-outline" size={50} color="#BDBDBD" />
                <Text style={styles.emptyText}>
                  คุณยังไม่มีตั๋วในหมวดหมู่นี้
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={!!selectedTicket} animationType="slide" transparent>
        <View style={styles.modalFullBg}>
          <View style={styles.modalBlueHeaderBg}>
            <View style={styles.headerGraphicCircle} />
          </View>

          <RNSafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                onPress={() => setSelectedTicket(null)}
                style={styles.backBtnCircle}
              >
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>รายละเอียดตั๋ว</Text>
              <View style={{ width: 40 }} />
            </View>

            {selectedTicket && (
              <ScrollView
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalTopInfo}>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedText}>● ยืนยันแล้ว</Text>
                  </View>
                  <Text style={styles.refText}>#{selectedTicket.refCode}</Text>
                </View>

                <View style={styles.modalRouteRow}>
                  <View>
                    <Text style={styles.modalCityText}>
                      {selectedTicket.origin}
                    </Text>
                    <Text style={styles.modalCodeText}>
                      BKK - {selectedTicket.depTime}น.
                    </Text>
                  </View>
                  <View style={styles.modalArrowCol}>
                    <Ionicons name="arrow-forward" size={24} color="#A8AACC" />
                    <Text style={styles.modalDurationText}>
                      {selectedTicket.duration}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.modalCityText}>
                      {selectedTicket.dest}
                    </Text>
                    <Text style={styles.modalCodeText}>
                      CMP - {selectedTicket.arrTime}น.
                    </Text>
                  </View>
                </View>

                <View style={styles.modalDarkCard}>
                  <View style={styles.grid3Col}>
                    <View style={styles.colItem}>
                      <Text style={styles.colLabel}>วันที่</Text>
                      <Text style={styles.colValue}>
                        {selectedTicket.date.split(" ")[0]}{" "}
                        {selectedTicket.date.split(" ")[1]}
                      </Text>
                    </View>
                    <View style={[styles.colItem, styles.colCenter]}>
                      <Text style={styles.colLabel}>ที่นั่ง</Text>
                      <Text style={styles.colValue}>{selectedTicket.seat}</Text>
                    </View>
                    <View style={[styles.colItem, { alignItems: "flex-end" }]}>
                      <Text style={styles.colLabel}>ตู้</Text>
                      <Text style={styles.colValue}>
                        {selectedTicket.cabin}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dividerDark} />

                  <View style={styles.timelineSection}>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineTime}>
                        {selectedTicket.depTime}
                      </Text>
                      <View style={styles.timelineLineGroup}>
                        <View style={styles.dotOutline} />
                        <View style={styles.lineSolid} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineCity}>
                          สถานี{selectedTicket.origin}
                        </Text>
                        <Text style={styles.timelineSub}>
                          จุดขึ้นรถไฟของคุณ
                        </Text>
                        <View style={styles.travelTimeBadge}>
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color="#A8AACC"
                          />
                          <Text style={styles.travelTimeText}>
                            {" "}
                            {selectedTicket.countdown}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineTime}>
                        {selectedTicket.arrTime}
                      </Text>
                      <View style={styles.timelineLineGroup}>
                        <View style={styles.dotFilled} />
                      </View>
                      <View
                        style={[styles.timelineContent, { paddingBottom: 0 }]}
                      >
                        <Text style={styles.timelineCity}>
                          สถานี{selectedTicket.dest}
                        </Text>
                        <Text style={styles.timelineSub}>จุดหมายปลายทาง</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.dividerDark} />

                  <View style={styles.grid2x2}>
                    <View style={styles.boxItem}>
                      <View
                        style={[styles.boxIcon, { backgroundColor: "#262956" }]}
                      >
                        <MaterialCommunityIcons
                          name="view-grid"
                          size={18}
                          color="#9575CD"
                        />
                      </View>
                      <View>
                        <Text style={styles.boxLabel}>ประเภท</Text>
                        <Text style={styles.boxValue}>
                          {selectedTicket.classType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.boxItem}>
                      <View
                        style={[styles.boxIcon, { backgroundColor: "#262956" }]}
                      >
                        <Ionicons name="location" size={18} color="#4CAF50" />
                      </View>
                      <View>
                        <Text style={styles.boxLabel}>ขบวน</Text>
                        <Text style={styles.boxValue}>
                          {selectedTicket.trainName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.boxItem}>
                      <View
                        style={[styles.boxIcon, { backgroundColor: "#262956" }]}
                      >
                        <Ionicons name="sync" size={18} color="#FBC02D" />
                      </View>
                      <View>
                        <Text style={styles.boxLabel}>ราคา</Text>
                        <Text style={styles.boxValue}>
                          THB {selectedTicket.price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.boxItem}>
                      <View
                        style={[styles.boxIcon, { backgroundColor: "#262956" }]}
                      >
                        <Ionicons name="train" size={18} color="#BA68C8" />
                      </View>
                      <View>
                        <Text style={styles.boxLabel}>สถานี</Text>
                        <Text style={styles.boxValue} numberOfLines={1}>
                          สถานี{selectedTicket.dest}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {selectedTicket.status === "upcoming" && (
                  <View style={styles.yellowWarningBanner}>
                    <Ionicons name="time-outline" size={24} color="#333" />
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={styles.warningLabel}>ออกเดินทางใน</Text>
                      <Text style={styles.warningTime}>
                        {selectedTicket.countdown.replace("ออกใน ", "")}
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.warningDate}>
                        {selectedTicket.date.split(" ")[0]}{" "}
                        {selectedTicket.date.split(" ")[1]}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#333"
                        style={{ marginLeft: 5 }}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </RNSafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  safeArea: { flex: 1, zIndex: 10 },
  blueHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: "#2E3165",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 0,
  },
  headerGraphicCircle: {
    position: "absolute",
    right: -50,
    top: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 30,
    marginHorizontal: 20,
    marginTop: 25,
    padding: 5,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 25,
  },
  tabBtnActive: { backgroundColor: "#FFF", elevation: 2 },
  tabText: { color: "#D1C4E9", fontWeight: "bold", fontSize: 14 },
  tabTextActive: { color: "#262956" },
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 50 },
  ticketCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  trainNameText: { fontSize: 14, fontWeight: "bold", color: "#333" },
  dateText: { fontSize: 12, color: "#9E9E9E", marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: "bold" },
  routeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    borderStyle: "dashed",
  },
  cityText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  timeText: { fontSize: 12, color: "#9E9E9E", marginTop: 2 },
  arrowContainer: { alignItems: "center", flex: 1 },
  durationText: { fontSize: 10, color: "#BDBDBD", marginBottom: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
  },
  seatBadge: {
    backgroundColor: "#EBE4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  seatBadgeText: { color: "#5E35B1", fontSize: 12, fontWeight: "bold" },
  footerStatusBox: { flexDirection: "row", alignItems: "center" },
  footerStatusText: { fontSize: 12, fontWeight: "bold" },
  priceText: { fontSize: 14, fontWeight: "bold", color: "#333" },
  cutoutLeft: {
    position: "absolute",
    top: 85,
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  cutoutRight: {
    position: "absolute",
    top: 85,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#9E9E9E", marginTop: 15, fontSize: 16 },
  modalFullBg: { flex: 1, backgroundColor: "#F5F5F5" },
  modalBlueHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "#2E3165",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 0,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalHeaderTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
  },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 50 },
  modalTopInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  confirmedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.5)",
  },
  confirmedText: { color: "#4CAF50", fontSize: 10, fontWeight: "bold" },
  refText: { color: "#A8AACC", fontSize: 10, fontWeight: "500" },
  modalRouteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  modalCityText: { fontSize: 22, fontWeight: "bold", color: "#FFF" },
  modalCodeText: { fontSize: 11, color: "#A8AACC", marginTop: 4 },
  modalArrowCol: { alignItems: "center" },
  modalDurationText: { fontSize: 10, color: "#A8AACC", marginTop: 5 },
  modalDarkCard: {
    backgroundColor: "#1E2046",
    borderRadius: 25,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  grid3Col: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  colItem: { flex: 1 },
  colCenter: {
    alignItems: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#3A3C59",
    paddingHorizontal: 10,
  },
  colLabel: { fontSize: 11, color: "#A8AACC", marginBottom: 5 },
  colValue: { fontSize: 14, fontWeight: "bold", color: "#FFF" },
  dividerDark: { height: 1, backgroundColor: "#3A3C59", marginVertical: 20 },
  timelineSection: { paddingLeft: 10 },
  timelineRow: { flexDirection: "row", marginBottom: 0 },
  timelineTime: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    width: 45,
    marginTop: -2,
  },
  timelineLineGroup: { width: 30, alignItems: "center", marginRight: 10 },
  dotOutline: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "#1E2046",
    zIndex: 2,
  },
  dotFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFF",
    zIndex: 2,
  },
  lineSolid: {
    width: 2,
    height: 60,
    backgroundColor: "#FFF",
    marginVertical: -2,
    zIndex: 1,
  },
  timelineContent: { flex: 1, paddingBottom: 25 },
  timelineCity: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
  },
  timelineSub: { color: "#A8AACC", fontSize: 12, marginBottom: 8 },
  travelTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262956",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: "flex-start",
  },
  travelTimeText: { color: "#A8AACC", fontSize: 10 },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  boxItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2046",
    padding: 12,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#3A3C59",
  },
  boxIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  boxLabel: { fontSize: 10, color: "#A8AACC" },
  boxValue: { fontSize: 12, fontWeight: "bold", color: "#FFF", marginTop: 2 },
  yellowWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDE047",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 25,
    marginBottom: 20,
    elevation: 5,
    shadowColor: "#FBC02D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  warningLabel: { fontSize: 10, color: "#333" },
  warningTime: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 2,
  },
  warningDate: { fontSize: 12, fontWeight: "bold", color: "#333" },
});
