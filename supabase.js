import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 🔴 เอา URL กับ API Key ที่มึงก๊อปไว้มาแปะแทนที่ตรงนี้เลยอาจารย์!
const supabaseUrl = 'https://xfkcogzlgjvwfspfihif.supabase.co';
const supabaseAnonKey = 'sb_publishable_PQ81hMSPmboKc8odHGinZA_S_i3gGgK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});