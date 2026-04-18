import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../supabase";

const { width } = Dimensions.get("window");

export default function AdminDashboardScreen() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalTrips: 0,
    revenue: 0,
    salesPercent: 0,
    totalUsers: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchAllDashboardData();
    }, []),
  );

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / 1000,
    );
    if (seconds < 60) return `เมื่อสักครู่`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return "";
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
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const fetchAllDashboardData = async () => {
    setLoading(true);
    try {
      // ==========================================
      // 📊 1. ดึงสถิติภาพรวม (Stats)
      // ==========================================
      const { count: tripsCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { data: revenueData } = await supabase
        .from("bookings")
        .select("total_price")
        .eq("status", "Confirmed");

      let totalRev = 0;
      let salesCount = revenueData ? revenueData.length : 0;
      if (revenueData) {
        totalRev = revenueData.reduce(
          (sum, b) => sum + (Number(b.total_price) || 350),
          0,
        );
      }

      setStats({
        totalTrips: tripsCount || 0,
        totalUsers: usersCount || 0,
        revenue: totalRev,
        salesPercent: tripsCount
          ? Math.min(Math.round((salesCount / (tripsCount * 40)) * 100), 100)
          : 0,
      });

      // ==========================================
      // 🚄 2. ดึงรอบเที่ยวล่าสุดที่แอดมินเพิ่งสร้าง
      // 🚀 (FIXED: แก้ให้ดึงสถานีผ่าน train_stops แทน เพื่อป้องกันโค้ดพัง)
      // ==========================================
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select(
          `
          id, departure_date, available_seats, status, created_at, train_id,
          trains ( type, train_number )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(3);

      let formattedTrips: any[] = [];
      if (tripsData && tripsData.length > 0) {
        const trainIds = tripsData.map((t) => t.train_id);
        const { data: stopsData } = await supabase
          .from("train_stops")
          .select(
            "train_id, departure_time, arrival_time, stations(station_name)",
          )
          .in("train_id", trainIds);

        formattedTrips = tripsData.map((t) => {
          const tStops =
            stopsData?.filter((s) => s.train_id === t.train_id) || [];
          tStops.sort((a, b) => {
            const timeA = a.departure_time || a.arrival_time || "00:00";
            const timeB = b.departure_time || b.arrival_time || "00:00";
            return timeA.localeCompare(timeB);
          });

          let routeName = `ขบวน ${t.trains?.train_number || "?"}`;
          let timeRange = "--:-- - --:--";

          if (tStops.length > 0) {
            const first = tStops[0];
            const last = tStops[tStops.length - 1];
            routeName = `${first.stations?.station_name || "?"} ➔ ${last.stations?.station_name || "?"}`;
            timeRange = `${first.departure_time?.substring(0, 5) || "--:--"} - ${last.arrival_time?.substring(0, 5) || "--:--"}`;
          }

          return {
            id: t.id.toString(),
            route: routeName,
            date: formatThaiDate(t.departure_date),
            time: timeRange,
            seat: `${t.available_seats || 40}/40`,
            status:
              t.status === "Scheduled"
                ? "เปิดจอง"
                : t.status === "Completed"
                  ? "เดินทางแล้ว"
                  : "เต็มแล้ว",
            statusColor: t.status === "Scheduled" ? "#E8F5E9" : "#FFEBEE",
            textColor: t.status === "Scheduled" ? "#4CAF50" : "#F44336",
            created_at: t.created_at,
          };
        });
        setRecentTrips(formattedTrips);
      }

      // ==========================================
      // 📣 3. ประวัติการส่งข่าวสาร
      // ==========================================
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .in("type", ["system", "promotion", "warning", "info"]) // รองรับทุกประเภทที่แอดมินส่ง
        .order("created_at", { ascending: false })
        .limit(300);

      let uniqueBroadcasts: any[] = [];
      if (notifs) {
        const grouped = new Map();
        notifs.forEach((n) => {
          const key = n.title + n.message;
          if (!grouped.has(key)) {
            grouped.set(key, {
              id: n.id.toString(),
              title: n.title,
              message: n.message,
              type: n.type,
              typeLabel:
                n.type === "system" || n.type === "warning"
                  ? "ประกาศระบบ"
                  : "โปรโมชั่น",
              recipients: 1,
              time: timeAgo(n.created_at),
              raw_time: n.created_at,
              created_at_ts: new Date(n.created_at).getTime(),
            });
          } else {
            grouped.get(key).recipients += 1;
          }
        });
        uniqueBroadcasts = Array.from(grouped.values()).sort(
          (a, b) => b.created_at_ts - a.created_at_ts,
        );
        setBroadcasts(uniqueBroadcasts.slice(0, 2));
      }

      // ==========================================
      // 🛠️ 4. กิจกรรมล่าสุด (เฉพาะของแอดมินล้วนๆ)
      // ==========================================
      let allActs: any[] = [];

      if (formattedTrips.length > 0) {
        formattedTrips
          .slice(0, 2)
          .forEach((t) =>
            allActs.push({
              id: `t_${t.id}`,
              title: `เพิ่มรอบเที่ยวใหม่: ${t.route}`,
              time: t.created_at,
              color: "#5E35B1",
            }),
          );
      }

      if (uniqueBroadcasts.length > 0) {
        uniqueBroadcasts
          .slice(0, 2)
          .forEach((br) =>
            allActs.push({
              id: `br_${br.id}`,
              title: `กระจายข่าวสาร: ${br.title}`,
              time: br.raw_time,
              color: "#D32F2F",
            }),
          );
      }

      const { data: latestBanners } = await supabase
        .from("banners")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(2);
      if (latestBanners)
        latestBanners.forEach((b) =>
          allActs.push({
            id: `b_${b.id}`,
            title: `จัดการแบนเนอร์: ${b.title || "อัปเดตแบนเนอร์ใหม่"}`,
            time: b.created_at,
            color: "#F57F17",
          }),
        );

      const { data: latestCoupons } = await supabase
        .from("coupons")
        .select("id, code, created_at")
        .order("created_at", { ascending: false })
        .limit(2);
      if (latestCoupons)
        latestCoupons.forEach((c) =>
          allActs.push({
            id: `c_${c.id}`,
            title: `สร้างคูปองส่วนลด: ${c.code}`,
            time: c.created_at,
            color: "#00796B",
          }),
        );

      allActs.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );

      const formattedActivities = allActs
        .slice(0, 5)
        .map((act) => ({ ...act, timeAgo: timeAgo(act.time) }));
      setActivities(formattedActivities);
    } catch (e) {
      console.error("Dashboard Realtime Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
        <View style={styles.headerCurve} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerTopRow}>
            {/* ปุ่มย้อนกลับ Home */}
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => router.push("/")}
            >
              <Ionicons name="home" size={20} color="#FFF" />
              <Text style={styles.homeBtnText}>หน้าหลักลูกค้า</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 25, marginTop: 15 }}>
            <Text style={styles.greetingText}>ศูนย์บัญชาการ</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#8A8CB2"
              style={{ marginLeft: 15 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาข้อมูลในระบบ..."
              placeholderTextColor="#8A8CB2"
            />
            <Ionicons
              name="options-outline"
              size={20}
              color="#8A8CB2"
              style={{ marginRight: 15 }}
            />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#5E35B1" />
          <Text style={{ marginTop: 10, color: "#757575" }}>
            กำลังโหลดข้อมูลศูนย์บัญชาการ...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ข้อมูลระบบ RailGo</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#EBE4FF" }]}
              >
                <Ionicons name="time" size={22} color="#5E35B1" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {stats.totalTrips.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>รอบเที่ยวทั้งหมด</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#FFF8E1" }]}
              >
                <Ionicons name="cash" size={22} color="#FFB300" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {(stats.revenue / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.statLabel}>รายได้โดยประมาณ</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#E8F5E9" }]}
              >
                <Ionicons name="card" size={22} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.statValue}>{stats.salesPercent}%</Text>
                <Text style={styles.statLabel}>อัตราการจองตั๋ว</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View
                style={[styles.statIconBox, { backgroundColor: "#E3F2FD" }]}
              >
                <Ionicons name="people" size={22} color="#2196F3" />
              </View>
              <View>
                <Text style={styles.statValue}>
                  {stats.totalUsers.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>ผู้ใช้งานทั้งหมด</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitleMain}>เมนูลัดสำหรับ Admin</Text>
          <View style={styles.quickMenuRow}>
            <TouchableOpacity
              style={styles.quickMenuBtn}
              onPress={() => router.push("/admin-trips")}
            >
              <View style={[styles.quickIcon, { backgroundColor: "#D1C4E9" }]}>
                <Ionicons name="train" size={26} color="#5E35B1" />
              </View>
              <Text style={styles.quickText}>เพิ่มรอบเที่ยว</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuBtn}
              onPress={() => router.push("/admin-coupons")}
            >
              <View style={[styles.quickIcon, { backgroundColor: "#B2DFDB" }]}>
                <MaterialCommunityIcons
                  name="ticket-percent"
                  size={26}
                  color="#00796B"
                />
              </View>
              <Text style={styles.quickText}>สร้างคูปอง</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuBtn}
              onPress={() => router.push("/admin-banners")}
            >
              <View style={[styles.quickIcon, { backgroundColor: "#FFECB3" }]}>
                <Ionicons name="images" size={26} color="#F57F17" />
              </View>
              <Text style={styles.quickText}>แบนเนอร์</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickMenuBtn}
              onPress={() => router.push("/admin-broadcast")}
            >
              <View style={[styles.quickIcon, { backgroundColor: "#FFCDD2" }]}>
                <Ionicons name="megaphone" size={26} color="#D32F2F" />
              </View>
              <Text style={styles.quickText}>ส่งข่าวสาร</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>กิจกรรมล่าสุดของแอดมิน</Text>
          </View>
          <View style={styles.activityContainer}>
            {activities.map((act) => (
              <View key={act.id} style={styles.activityItem}>
                <View
                  style={[styles.activityDot, { backgroundColor: act.color }]}
                />
                <Text style={styles.activityTitle} numberOfLines={2}>
                  {act.title}
                </Text>
                <Text style={styles.activityTime}>{act.timeAgo}</Text>
              </View>
            ))}
            {activities.length === 0 && (
              <Text style={{ color: "#9E9E9E", fontSize: 12 }}>
                ยังไม่มีกิจกรรมเคลื่อนไหว
              </Text>
            )}
          </View>

          <View style={[styles.historyHeader, { marginTop: 10 }]}>
            <Text style={styles.sectionTitle}>รอบเที่ยวที่เพิ่มล่าสุด</Text>
            <TouchableOpacity onPress={() => router.push("/admin-trips")}>
              <Text style={styles.viewAllText}>จัดการทั้งหมด</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thText, { flex: 2 }]}>เส้นทาง</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>วันที่เดินทาง</Text>
              <Text style={[styles.thText, { flex: 1.5 }]}>เวลา</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "center" }]}>
                ที่นั่ง
              </Text>
              <Text style={[styles.thText, { flex: 1, textAlign: "center" }]}>
                สถานะ
              </Text>
            </View>

            {recentTrips.map((trip) => (
              <View key={trip.id} style={styles.tableRow}>
                <Text
                  style={[
                    styles.tdText,
                    { flex: 2, fontWeight: "bold", color: "#333" },
                  ]}
                  numberOfLines={1}
                >
                  {trip.route}
                </Text>
                <Text style={[styles.tdText, { flex: 1.5 }]}>{trip.date}</Text>
                <Text style={[styles.tdText, { flex: 1.5 }]}>{trip.time}</Text>
                <Text
                  style={[
                    styles.tdText,
                    {
                      flex: 1,
                      textAlign: "center",
                      color: trip.textColor,
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {trip.seat}
                </Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: trip.statusColor },
                    ]}
                  >
                    <Text
                      style={[styles.statusPillText, { color: trip.textColor }]}
                    >
                      {trip.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {recentTrips.length === 0 && (
              <Text
                style={{
                  color: "#9E9E9E",
                  textAlign: "center",
                  marginVertical: 10,
                }}
              >
                ไม่มีรอบรถในระบบ
              </Text>
            )}
          </View>

          <View style={[styles.historyHeader, { marginTop: 30 }]}>
            <Text style={styles.sectionTitle}>ประวัติการส่งข่าวสาร</Text>
          </View>

          {broadcasts.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View
                style={[
                  styles.cardTag,
                  {
                    backgroundColor:
                      item.type === "system" || item.type === "warning"
                        ? "#F44336"
                        : "#5E35B1",
                  },
                ]}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      item.type === "system" || item.type === "warning"
                        ? styles.badgeWarning
                        : styles.badgeInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            item.type === "system" || item.type === "warning"
                              ? "#F44336"
                              : "#2196F3",
                        },
                      ]}
                    >
                      {item.typeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMessage} numberOfLines={2}>
                  {item.message}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Ionicons name="people-outline" size={14} color="#9E9E9E" />
                    <Text style={styles.footerText}>
                      {item.recipients.toLocaleString()} คน · {item.time}
                    </Text>
                  </View>
                  <View style={styles.statusSuccess}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#4CAF50"
                    />
                    <Text style={styles.statusText}>ส่งสำเร็จ</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          {broadcasts.length === 0 && (
            <Text style={{ color: "#9E9E9E", textAlign: "center" }}>
              ยังไม่เคยส่งข้อความ Broadcast
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  headerBg: {
    backgroundColor: "#262956",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 25,
    overflow: "hidden",
  },
  headerCurve: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  homeBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  greetingText: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1C3E",
    marginHorizontal: 25,
    marginTop: 20,
    borderRadius: 20,
    height: 45,
  },
  searchInput: { flex: 1, color: "#FFF", marginLeft: 10, fontSize: 14 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingBottom: 10,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    marginBottom: 10,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 10, color: "#757575", marginTop: 2 },
  sectionTitleMain: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    marginTop: 15,
  },
  quickMenuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 20,
  },
  quickMenuBtn: { alignItems: "center", width: "23%" },
  quickIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickText: {
    fontSize: 10,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  activityContainer: { marginBottom: 20 },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  activityTitle: { flex: 1, fontSize: 13, color: "#333", fontWeight: "500" },
  activityTime: { fontSize: 10, color: "#9E9E9E", marginLeft: 10 },
  tableContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 15,
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 10,
    marginBottom: 10,
  },
  thText: { fontSize: 10, color: "#9E9E9E", fontWeight: "bold" },
  tableRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  tdText: { fontSize: 11, color: "#555" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 9, fontWeight: "bold" },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  viewAllText: { fontSize: 12, color: "#757575", fontWeight: "bold" },
  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    flexDirection: "row",
  },
  cardTag: { width: 6 },
  cardContent: { flex: 1, padding: 15 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: "#333", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeInfo: { backgroundColor: "#E3F2FD" },
  badgeWarning: { backgroundColor: "#FFEBEE" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  cardMessage: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerInfo: { flexDirection: "row", alignItems: "center" },
  footerText: { fontSize: 11, color: "#9E9E9E", marginLeft: 5 },
  statusSuccess: { flexDirection: "row", alignItems: "center" },
  statusText: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "bold",
    marginLeft: 4,
  },
});
