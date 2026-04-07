import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    // เปลี่ยนจาก Tabs เป็น Stack (การซ้อนหน้าจอปกติ ไม่มีแถบด้านล่าง)
    <Stack screenOptions={{ headerShown: false }}>
      
      {/* แจ้งให้ระบบรู้ว่ามีหน้าจออะไรบ้าง */}
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="index" />
      <Stack.Screen name="(booking)" />
      
    </Stack>
  );
}