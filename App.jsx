import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc,
  doc,
  writeBatch,
  setDoc,
  getDocs
} from 'firebase/firestore';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Filter, 
  DollarSign, 
  ShoppingBag, 
  MousePointer2, 
  HelpCircle,
  AlertCircle,
  Info,
  List,
  Calendar,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ListFilter,
  MousePointerClick,
  Download,
  Printer,
  ChevronRight,
  X,
  BarChart2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader,
  Globe,
  Users,
  LogIn,
  LogOut,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Lock,
  User,
  Database,
  WifiOff
} from 'lucide-react';

// Firebase Configuration
// ใส่ค่าจริงไว้ในไฟล์ .env.local เท่านั้น อย่าใส่ secret/private key ลงใน frontend
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const parseCredentialList = (raw = '') => {
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [username, ...passwordParts] = item.split(':');
      return {
        username: String(username || '').trim().toLowerCase(),
        password: String(passwordParts.join(':') || '').trim().toLowerCase()
      };
    })
    .filter(item => item.username && item.password);
};

const DASHBOARD_USERS = parseCredentialList(import.meta.env.VITE_DASHBOARD_USERS);
const STAFF_USERS = parseCredentialList(import.meta.env.VITE_STAFF_USERS);

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let app = null;
let auth = null;
let db = null;
let initError = null;

try {
  if (!hasFirebaseConfig) {
    throw new Error('Missing Firebase environment variables. Please create .env.local from .env.example.');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  initError = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบไฟล์ .env.local และการตั้งค่า Firebase";
}

const appId = 'affiliate-dashboard-app';

// --- Safe LocalStorage Helper ---
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("LocalStorage access denied", e);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("LocalStorage write denied", e);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("LocalStorage remove denied", e);
    }
  }
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className} print:border-gray-300 print:shadow-none`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass, subText, comparison }) => (
  <Card className="p-6 flex items-center space-x-4 print:p-4 print:border">
    <div className={`p-3 rounded-full ${colorClass} print:bg-gray-100 print:text-black`}>
      <Icon size={24} className="text-white print:text-black" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-slate-500 font-medium print:text-gray-600">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 print:text-black">{value}</h3>
      <div className="flex items-center justify-between mt-1">
          {subText && <p className="text-xs text-slate-400 print:text-gray-500">{subText}</p>}
          {comparison && (
              <div className={`flex items-center text-xs font-bold ${comparison.isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {comparison.isPositive ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                  {comparison.value}% <span className="text-slate-400 font-normal ml-1">vs 30 วันก่อน</span>
              </div>
          )}
      </div>
    </div>
  </Card>
);

// --- Helper: Normalize Sub_id2 (Grouping similar names) ---
const normalizeSubId2 = (val) => {
    if (!val || val === '-') return '-';
    const v = String(val).trim();
    const lower = v.toLowerCase();
    
    if (lower === 'fbpost' || lower === 'fb_post' || lower === 'facebook post' || lower === 'post') return 'FBPost';
    if (lower === 'fblive' || lower === 'fb_live' || lower === 'facebook live' || lower === 'live') return 'FBLive';
    if (lower === 'fbvideo' || lower === 'fb_video' || lower === 'video') return 'FBVideo';
    if (lower === 'ig' || lower === 'instagram' || lower === 'igstory') return 'Instagram';
    if (lower === 'tt' || lower === 'tiktok') return 'TikTok';
    if (lower === 'shopee' || lower === 'shp' || lower === 'shopeevideo') return 'Shopee';
    if (lower === 'line' || lower === 'lineoa' || lower === 'linevoom') return 'Line';
    if (lower === 'twitter' || lower === 'x') return 'Twitter';
    if (lower === 'website' || lower === 'web') return 'Website';
    
    if (v.length > 0) {
        if (v === v.toUpperCase() && v.length > 1) return v;
        return v.charAt(0).toUpperCase() + v.slice(1);
    }
    
    return v;
};

// --- Helper for Product Name Shortening ---
const shortenProductName = (fullName) => {
    if (!fullName) return '-';
    
    let name = fullName;
    let extractedCode = '';

    const codeRegex = /((?:CottonMix|Delight|CHIC|DLD|DLC|FTC|MCT|JES|TFG|MK|MV|FT|CT|LI|CV|TE|DL|M)\s*[-.]?\s*\d+)/i;
    const match = name.match(codeRegex);
    if (match) {
        extractedCode = match[1].toUpperCase().replace(/\s+/g, ''); 
        name = name.replace(codeRegex, ' '); 
    }

    const fluffPhrases = [
        /สัมผัสนุ่ม[^ ]*/gi,  
        /ไม่ระคายผิว/gi,
        /นุ่มละมุน/gi,
        /ให้ความมินิมอล/gi,
        /สไตล์มินิมอล/gi,
        /มินิมอล/gi,
        /Minimal/gi,
        /ไร้รอยต่อ/gi,
        /ทอเต็มผืน/gi,
        /ซักแล้วไม่เป็นขุย/gi,
        /สีไม่ตก/gi,
        /ระบายอากาศได้ดี/gi,
        /ระบายอากาศ/gi,
        /ป้องกันไรฝุ่น/gi,
        /กันไรฝุ่น/gi,
        /ลิขสิทธิ์แท้/gi,
        /ของแท้\s*100%/gi,
        /จัดส่งฟรี/gi,
        /มีเก็บปลายทาง/gi,
        /เนื้อผ้าละเอียด/gi,
        /เกรดพรีเมี่ยม/gi,
        /Premium/gi,
        /Seamless/gi,
        /Microfiber/gi,
        /Cotton\s*Mix/gi,
        /Poly/gi,
        /ชุดเครื่องนอน/gi, 
        /เตียงคู่/gi,
        /เตียงเดี่ยว/gi,
        /ขนาด/gi,
        /ฟุต/gi,
        /3\.5/gi, 
        /5/gi,
        /6/gi,
        /ผ้าห่มนวม/gi, 
        /ผ้านวม/gi,
        /พิมพ์ดิจิตอล/gi,
        /ดิสนีย์/gi,
        /Disney/gi,
        /น้ำหนักเบา/gi,
        /สีพาสเทล/gi,
    ];

    fluffPhrases.forEach(regex => {
        name = name.replace(regex, '');
    });

    name = name.replace(/[|\[\](){},.\-]/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();

    let finalName = '';
    if (extractedCode) {
        finalName = `${extractedCode} ${name}`;
    } else {
        finalName = name;
    }
    
    finalName = finalName.trim();
    if (finalName.length < 3) return fullName.substring(0, 20);

    return finalName;
};

const ProductListCell = ({ products }) => {
    const [expanded, setExpanded] = useState(false);
    
    const displayProducts = useMemo(() => {
        return products.map(p => ({
            ...p,
            shortName: shortenProductName(p.name)
        }));
    }, [products]);

    const showList = expanded ? displayProducts : displayProducts.slice(0, 2);

    return (
        <div className="flex flex-col gap-1 text-xs text-slate-500">
            {showList.map((p, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                    <span title={p.name} className="truncate max-w-[350px]">{p.shortName}</span>
                    <span className="font-medium text-slate-700 whitespace-nowrap">({p.qty})</span>
                </div>
            ))}
            {displayProducts.length > 2 && (
                <button 
                    onClick={() => setExpanded(!expanded)} 
                    className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 self-start mt-1 bg-blue-50 px-2 py-0.5 rounded"
                >
                    {expanded ? <><ChevronUp size={10} /> ย่อรายการ</> : <><ChevronDown size={10} /> ดูทั้งหมด ({products.length})</>}
                </button>
            )}
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState(null);
  
  // Global Gatekeeper State
  const [isGlobalAuth, setIsGlobalAuth] = useState(false);
  const [globalUsername, setGlobalUsername] = useState('');
  const [globalPassword, setGlobalPassword] = useState('');

  const [salesData, setSalesData] = useState([]);
  const [clickData, setClickData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('Tulip');
  
  // Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');

  // Sub_id2 Filter for Deep Dive
  const [selectedSubId2ForAnalysis, setSelectedSubId2ForAnalysis] = useState('All');
  
  // Local Filter for Click Report Table
  const [clickTableSub2Filter, setClickTableSub2Filter] = useState('All');

  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [papaLoaded, setPapaLoaded] = useState(false);
  
  // Admin / Auth State
  const [adminUser, setAdminUser] = useState(null); 
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null); 

  const [sortConfig, setSortConfig] = useState({ key: 'clicks', direction: 'descending' });

  // --- Print Shortcut ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Global Gatekeeper Check ---
  useEffect(() => {
      const storedAuth = safeStorage.getItem('kc_global_auth');
      if (storedAuth === 'true') {
          setIsGlobalAuth(true);
      }
  }, []);

  const handleGlobalLogin = (e) => {
      e.preventDefault();
      const u = globalUsername.toLowerCase().trim();
      const p = globalPassword.toLowerCase().trim();
      const isAllowed = DASHBOARD_USERS.some(item => item.username === u && item.password === p);

      if (isAllowed) {
          setIsGlobalAuth(true);
          safeStorage.setItem('kc_global_auth', 'true');
          setGlobalUsername('');
          setGlobalPassword('');
      } else {
          alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า VITE_DASHBOARD_USERS ในไฟล์ .env.local');
      }
  };

  const handleGlobalLogout = () => {
      setIsGlobalAuth(false);
      safeStorage.removeItem('kc_global_auth');
      setAdminUser(null);
  };

  // --- Reset Filters ---
  useEffect(() => {
      setSelectedSubId2ForAnalysis('All');
      setClickTableSub2Filter('All');
      setStartDate('');
      setEndDate('');
      setSelectedMonth('All');
  }, [selectedBrand]);

  const handleResetFilters = () => {
      setStartDate('');
      setEndDate('');
      setSelectedMonth('All');
      setSelectedSubId2ForAnalysis('All');
      setClickTableSub2Filter('All');
  };

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (!auth) return; 
    const initAuth = async () => {
      try {
        // ใช้การเข้าสู่ระบบแบบ Anonymous แทนการใช้ Custom Token ของแพลตฟอร์ม
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Authentication Error:", err);
        if (err.code === 'auth/operation-not-allowed') {
          console.warn("Please enable 'Anonymous' sign-in provider in your Firebase Console.");
        }
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isGlobalAuth || !db) {
        if (!db) setLoading(false); 
        return;
    }
    
    // Realtime Sales Listener
    const qSales = query(collection(db, 'artifacts', appId, 'public', 'data', 'affiliate_sales'));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalesData(sales);
    }, (error) => console.error("Error fetching sales:", error));

    // Realtime Clicks Listener
    const qClicks = query(collection(db, 'artifacts', appId, 'public', 'data', 'affiliate_clicks'));
    const unsubClicks = onSnapshot(qClicks, (snapshot) => {
      const clicks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClickData(clicks);
      setLoading(false); 
    }, (error) => {
      console.error("Error fetching clicks:", error);
      setLoading(false);
    });

    return () => {
        unsubSales();
        unsubClicks();
    };
  }, [user, isGlobalAuth]);

  // --- Load PapaParse ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js';
    script.async = true;
    script.onload = () => setPapaLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // --- Helpers ---
  const cleanNumber = (val) => {
      if (!val) return 0;
      const cleaned = String(val).replace(/[^0-9.-]/g, '');
      return Number(cleaned) || 0;
  };

  const cleanKey = (key) => {
      return String(key || '').replace(/[\uFEFF\u0000-\u001F]/g, '').trim().toLowerCase();
  };

  const parseAnyDate = (val) => {
      if (!val) return null;
      let d = new Date(val);
      if (!isNaN(d.getTime())) return d;

      const parts = String(val).split(/[-/ :]/);
      if (parts.length >= 3) {
          const p1 = parseInt(parts[0]);
          const p2 = parseInt(parts[1]);
          const p3 = parseInt(parts[2]);
          
          if (p3 > 1900) { // D/M/Y
              let year = p3;
              if (year > 2400) year -= 543; 
              return new Date(year, p2 - 1, p1);
          }
          if (p1 > 1900) { // Y/M/D
              let year = p1;
              if (year > 2400) year -= 543;
              return new Date(year, p2 - 1, p3);
          }
      }
      return null;
  };

  // --- Auth Handlers (Inner Admin) ---
  const handleLogin = (e) => {
      e.preventDefault();
      const u = loginUsername.toLowerCase().trim();
      const p = loginPassword.toLowerCase().trim();
      const staff = STAFF_USERS.find(item => item.username === u && item.password === p);

      if (staff) {
          setAdminUser({ username: staff.username });
          setShowLoginModal(false);
          setLoginUsername('');
          setLoginPassword('');
          
          if (pendingAction === 'upload') {
             alert("เข้าสู่ระบบสำเร็จ! กรุณาเลือกไฟล์เพื่ออัปโหลดอีกครั้ง");
          } else if (pendingAction === 'delete') {
             setShowDeleteModal(true);
          }
          setPendingAction(null);
      } else {
          alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า VITE_STAFF_USERS ในไฟล์ .env.local");
      }
  };

  const handleLogout = () => {
      setAdminUser(null);
  };

  const checkPermission = (action) => {
      if (adminUser) return true;
      setPendingAction(action);
      setShowLoginModal(true);
      return false;
  };

  // --- Automatic Date Range Calculation ---
  useEffect(() => {
      if ((salesData.length === 0 && clickData.length === 0) || (startDate && endDate)) return;

      const allDates = [
          ...salesData.map(d => parseAnyDate(d.raw_date || d.order_date)),
          ...clickData.map(d => parseAnyDate(d.click_time || d.click_date))
      ].filter(Boolean).map(d => d.getTime());

      if (allDates.length > 0) {
          const minTs = Math.min(...allDates);
          const maxTs = Math.max(...allDates);
          if (!startDate) setStartDate(new Date(minTs).toISOString().split('T')[0]);
          if (!endDate) setEndDate(new Date(maxTs).toISOString().split('T')[0]);
      }
  }, [salesData, clickData, startDate, endDate]);

  const handleMonthChange = (e) => {
      const val = e.target.value;
      setSelectedMonth(val);
      if (val === 'All') {
          const allDates = [
            ...salesData.map(d => parseAnyDate(d.raw_date || d.order_date)),
            ...clickData.map(d => parseAnyDate(d.click_time || d.click_date))
        ].filter(Boolean).map(d => d.getTime());
        if (allDates.length > 0) {
            setStartDate(new Date(Math.min(...allDates)).toISOString().split('T')[0]);
            setEndDate(new Date(Math.max(...allDates)).toISOString().split('T')[0]);
        }
      } else {
          const [year, month] = val.split('-');
          const start = new Date(year, parseInt(month) - 1, 1);
          const end = new Date(year, parseInt(month), 0); 
          
          const format = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setStartDate(format(start));
          setEndDate(format(end));
      }
  };

  // --- Unified Upload Handler ---
  const handleUniversalUpload = (event) => {
      if (!checkPermission('upload') || !db) {
          event.target.value = null; 
          return;
      }

      const file = event.target.files[0];
      if (!file || !user) return;
      if (!papaLoaded || !(window).Papa) { alert("ระบบกำลังโหลด.. กรุณาลองใหม่"); return; }

      setUploading(true);
      (window).Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          complete: async (results) => {
              const rows = results.data;
              if (rows.length < 2) { alert("ไฟล์ว่างเปล่า"); setUploading(false); return; }

              const headers = rows[0].map(h => cleanKey(h));
              let uploadType = 'unknown';

              const hasSub4 = headers.some(h => h.includes('sub_id4') || (h.includes('sub') && h.includes('4')));
              const hasValue = headers.some(h => h.includes('order_value') || h.includes('มูลค่า') || h.includes('price') || h.includes('amount'));
              const hasOrderCode = headers.some(h => h.includes('รหัสการสั่งซื้อ') || h.includes('เลขที่คำสั่งซื้อ'));
              const hasCommission = headers.some(h => h.includes('commission') || h.includes('ค่าคอมมิชชั่น'));

              if ((hasSub4 && hasValue) || (hasOrderCode && hasCommission)) {
                  uploadType = 'sale';
              } else if (headers.some(h => h.includes('รหัสคลิก') || h.includes('click_id') || h.includes('อ้างอิ'))) {
                  uploadType = 'raw_click';
              } else if (headers.some(h => h.includes('clicks') || h.includes('ยอดคลิก'))) {
                  uploadType = 'agg_click';
              }

              if (uploadType === 'unknown') {
                 const sampleRow = rows[1];
                 if (sampleRow && sampleRow.length > 3) {
                     if (headers.some(h => h.includes('อ้างอิqง'))) {
                         uploadType = 'raw_click';
                     } else if (sampleRow.some(v => String(v).includes('FBPost') || String(v).includes('FBCaption'))) {
                         uploadType = 'raw_click'; 
                     }
                 }
              }

              if (uploadType === 'unknown') {
                 alert(`ไม่สามารถระบุประเภทไฟล์ได้\nกรุณาตรวจสอบว่าไฟล์มีคอลัมน์:\n- 'Sub_id4' และ 'มูลค่าซื้อ' (สำหรับยอดขาย)\n- หรือ 'รหัสคลิก' (สำหรับยอดคลิก)`);
                 setUploading(false);
                 return;
              }

              const batchSize = 250; 
              let count = 0;
              const getLatestDate = (timeIdx) => {
                  let maxTime = 0;
                  rows.slice(1).forEach(row => {
                      if (row[timeIdx]) {
                           const d = parseAnyDate(row[timeIdx]);
                           if(d && d.getTime() > maxTime) maxTime = d.getTime();
                      }
                  });
                  return maxTime > 0 ? new Date(maxTime).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
              };

              if (uploadType === 'sale') {
                  const idxMap = {
                      sub4: headers.findIndex(h => h.includes('sub_id4') || (h.includes('sub') && h.includes('4'))),
                      time: headers.findIndex(h => h.includes('เวลาที่สั่งซื้อ') || h.includes('order_time')),
                      val: headers.findIndex(h => h.includes('มูลค่าซื้อ') || h.includes('order_value') || h.includes('amount') || h.includes('price')),
                      shop: headers.findIndex(h => h.includes('ชื่อร้านค้า') || h.includes('shop_name')),
                      prod: headers.findIndex(h => h.includes('ชื่อรายการสินค้า') || h.includes('product_name')),
                      qty: headers.findIndex(h => h.includes('จำนวน') || h.includes('quantity')),
                      sub2: headers.findIndex(h => h.includes('sub_id2')),
                      sub3: headers.findIndex(h => h.includes('sub_id3')),
                      id: headers.findIndex(h => h.includes('เลขที่คำสั่งซื้อ') || h.includes('order_id') || h.includes('รหัสการสั่งซื้อ')),
                  };
                  
                  const uploadDateStr = idxMap.time > -1 ? getLatestDate(idxMap.time) : new Date().toLocaleDateString('th-TH');

                  for (let i = 1; i < rows.length; i += batchSize) {
                      const batch = writeBatch(db);
                      rows.slice(i, i + batchSize).forEach(row => {
                          if (row[idxMap.sub4]) {
                              const d = idxMap.time > -1 ? parseAnyDate(row[idxMap.time]) : null;
                              const id = (idxMap.id > -1 && row[idxMap.id]) ? String(row[idxMap.id]).trim() : `auto_${Math.random()}`;
                              batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'affiliate_sales', id), {
                                  sub_id4: String(row[idxMap.sub4]).trim(),
                                  shop_name: idxMap.shop > -1 ? String(row[idxMap.shop] || '-') : '-',
                                  product_name: idxMap.prod > -1 ? String(row[idxMap.prod] || '-') : '-',
                                  quantity: idxMap.qty > -1 ? cleanNumber(row[idxMap.qty]) : 1,
                                  order_value: idxMap.val > -1 ? cleanNumber(row[idxMap.val]) : 0,
                                  sub_id2: idxMap.sub2 > -1 ? String(row[idxMap.sub2] || '-') : '-',
                                  sub_id3: idxMap.sub3 > -1 ? String(row[idxMap.sub3] || '-') : '-',
                                  order_date: d ? d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
                                  raw_date: d ? d.toISOString() : null,
                                  upload_date: uploadDateStr,
                                  type: 'sale',
                                  updated_by: adminUser.username
                              }, { merge: true });
                              count++;
                          }
                      });
                      await batch.commit();
                      await new Promise(r => setTimeout(r, 50));
                  }
              } else {
                  const idxMap = {
                      clickId: headers.findIndex(h => h.includes('รหัสคลิก') || h.includes('click_id')),
                      time: headers.findIndex(h => h.includes('เวลาคลิก') || h.includes('click_time')),
                      region: headers.findIndex(h => h.includes('ภาค') || h.includes('region')),
                      subCombined: headers.findIndex(h => (h.includes('sub_id') || h.includes('subid')) && !h.includes('sub_id2') && !h.includes('วิเคราะห์')), 
                      ref: headers.findIndex(h => h.includes('อ้างอิง') || h.includes('อ้างอิ') || h.includes('referrer') || h.includes('ช่องทาง')),
                      s2: headers.findIndex(h => h === 'sub_id2'),
                      s3: headers.findIndex(h => h === 'sub_id3'),
                      clicks: headers.findIndex(h => h.includes('click') && !h.includes('id') && !h.includes('time')),
                  };
                  if (uploadType === 'raw_click' && idxMap.subCombined === -1) {
                        const sampleRow = rows[1];
                        if (sampleRow) idxMap.subCombined = sampleRow.findIndex(val => String(val).includes('-'));
                  }
                  const uploadDateStr = idxMap.time > -1 ? getLatestDate(idxMap.time) : new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  for (let i = 1; i < rows.length; i += batchSize) {
                      const batch = writeBatch(db);
                      rows.slice(i, i + batchSize).forEach(row => {
                          if (uploadType === 'agg_click') {
                              const s2 = row[idxMap.s2] || '-';
                              const s3 = row[idxMap.s3] || '-';
                              const ref = idxMap.ref > -1 ? row[idxMap.ref] : '-';
                              const qty = cleanNumber(row[idxMap.clicks]);
                              const docId = `agg_${ref}_${s2}_${s3}_${uploadDateStr}`.replace(/[\/\.\s]/g, '_');
                              batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'affiliate_clicks', docId), {
                                  sub_id2: s2, sub_id3: s3, sub_id4: selectedBrand, referrer: ref, quantity: qty,
                                  upload_date: uploadDateStr, click_date: uploadDateStr, type: 'click_aggregated',
                                  updated_by: adminUser.username
                              }, { merge: true });
                              count++;
                          } else {
                              const rawSub = idxMap.subCombined > -1 ? String(row[idxMap.subCombined] || '') : '';
                              const cId = (idxMap.clickId > -1 && row[idxMap.clickId]) ? String(row[idxMap.clickId]).trim() : `clk_${Math.random()}`;
                              if (rawSub) {
                                  const parts = rawSub.split('-');
                                  let s2 = '-', s3 = '-', s4 = '-';
                                  if (parts.length >= 4) { s2 = parts[1]; s3 = parts[2]; s4 = parts[3]; } 
                                  else if (parts.length >= 3) { s2 = parts[1]; s3 = parts[2]; } 
                                  else if (parts.length >= 2) { s2 = parts[1]; }
                                  const d = idxMap.time > -1 ? parseAnyDate(row[idxMap.time]) : null;
                                  const ref = idxMap.ref > -1 ? String(row[idxMap.ref]).trim() : '-';
                                  const region = idxMap.region > -1 ? String(row[idxMap.region]).trim() : '-';
                                  batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'affiliate_clicks', cId), {
                                      sub_id2: s2, sub_id3: s3, sub_id4: s4, referrer: ref, region: region, raw_sub_id: rawSub,
                                      click_time: d ? d.toISOString() : null,
                                      click_date: d ? d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : uploadDateStr,
                                      upload_date: uploadDateStr, quantity: 1, type: 'click_raw', updated_by: adminUser.username
                                  }, { merge: true });
                                  count++;
                              }
                          }
                      });
                      await batch.commit();
                      await new Promise(r => setTimeout(r, 50));
                  }
              }
              alert(`นำเข้าข้อมูลสู่ระบบสาธารณะสำเร็จ: ${count} รายการ (Admin: ${adminUser.username})`);
              setUploading(false);
          },
          error: (e) => { alert("Error: " + e.message); setUploading(false); }
      });
      event.target.value = null;
  };

  const handleClearData = async () => {
    if (!user || !db) return;
    setUploading(true);
    setShowDeleteModal(false);
    try {
        const [s, c] = await Promise.all([
            getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'affiliate_sales')),
            getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'affiliate_clicks'))
        ]);
        const docs = [...s.docs, ...c.docs];
        const batchSize = 250;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = writeBatch(db);
            docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
            await batch.commit();
            await new Promise(r => setTimeout(r, 50));
        }
        setSalesData([]);
        setClickData([]);
        alert('ลบข้อมูลสาธารณะทั้งหมดเรียบร้อยแล้ว');
    } catch (e) { alert('Error: ' + e.message); } 
    finally { setUploading(false); }
  };

  const requestDelete = () => {
      if (checkPermission('delete')) {
          setShowDeleteModal(true);
      }
  };

  const exportToCSV = (data, filename) => {
      if (!data.length) return;
      const headers = Object.keys(data[0]);
      const csv = [
          headers.join(','),
          ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportAll = () => {
      if (filteredSales.length === 0) {
          alert("ไม่พบข้อมูลยอดขายในช่วงเวลาที่เลือก");
          return;
      }
      exportToCSV(filteredSales.map(s => ({
          ...s,
          product_short_name: shortenProductName(s.product_name)
      })), `Sales_Export_${selectedBrand}_${startDate || 'All'}.csv`);
  };

  // --- Sorting & Helpers ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const sortData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle numeric sorting
        if (['quantity', 'order_value', 'clicks', 'conversion_rate', 'count', 'value'].includes(sortConfig.key)) {
            valA = Number(valA || 0); 
            valB = Number(valB || 0);
        } else {
            // Handle string sorting (Case Insensitive)
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }

        if (sortConfig.key === 'order_date' || sortConfig.key === 'click_date') {
            const dateA = a.raw_date || a.click_time || a.order_date || '';
            const dateB = b.raw_date || b.click_time || b.order_date || '';
            valA = dateA; valB = dateB;
        }

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
  };

  const formatCurrency = (num) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);

  const SortHeader = ({ label, k, align='left' }) => (
      <th className={`px-4 py-3 cursor-pointer hover:bg-slate-100 text-${align} sticky top-0 bg-slate-50 z-10 shadow-sm`} onClick={() => requestSort(k)}>
          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
              {label} {sortConfig.key === k ? (sortConfig.direction === 'ascending' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="opacity-30"/>}
          </div>
      </th>
  );

  // --- Data Processing ---
  const brands = ['Tulip', 'Jessica', 'Fountain'];
  
  const availableMonths = useMemo(() => {
      const set = new Set();
      const addToSet = (dStr) => {
          if (!dStr) return;
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) {
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; 
              set.add(key);
          }
      };
      salesData.forEach(d => addToSet(d.raw_date));
      clickData.forEach(d => addToSet(d.raw_date || d.click_time));
      return Array.from(set).sort().reverse(); 
  }, [salesData, clickData]);

  const latestInfo = useMemo(() => {
      const getLatest = (data) => {
          if (!data || !data.length) return '-';
          const times = data.map(d => new Date(d.raw_date || d.click_time || 0).getTime());
          const max = Math.max(...times);
          return max > 0 ? new Date(max).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
      };
      return { sales: getLatest(salesData), clicks: getLatest(clickData) };
  }, [salesData, clickData]);

  const filterData = (data) => {
      return data.filter(d => {
          if (d.sub_id4 && d.sub_id4.toLowerCase() !== selectedBrand.toLowerCase()) return false;
          
          const dt = parseAnyDate(d.raw_date || d.click_time || d.order_date || d.click_date);
          if (dt) {
              dt.setHours(0,0,0,0);
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              if (start) { start.setHours(0,0,0,0); if (dt < start) return false; }
              if (end) { end.setHours(23,59,59); if (dt > end) return false; }
          }
          return true;
      });
  };

  const filteredSales = useMemo(() => filterData(salesData), [salesData, selectedBrand, startDate, endDate]);
  const filteredClicks = useMemo(() => filterData(clickData), [clickData, selectedBrand, startDate, endDate]);

  const stats = useMemo(() => {
      let directSales = [], indirectSales = [];
      let totalDirectVal = 0, totalDirectQty = 0;
      let totalSub2Clicks = 0;
      let sub2Map = {}, sub3Map = {}; 

      filteredClicks.forEach(c => {
          const rawS2 = c.sub_id2 || '-';
          const s2 = normalizeSubId2(rawS2); 
          const s3 = c.sub_id3 || '-';
          const qty = c.quantity || 1;
          const key3 = `${s2}|${s3}`;
          
          if (!sub2Map[s2]) sub2Map[s2] = { count: 0, value: 0, quantity: 0, clicks: 0 };
          sub2Map[s2].clicks += qty;
          
          if (selectedSubId2ForAnalysis === 'All' || s2 === selectedSubId2ForAnalysis) {
              if (!sub3Map[key3]) sub3Map[key3] = { sub_id2: s2, name: s3, count: 0, value: 0, quantity: 0, clicks: 0, products: {} };
              sub3Map[key3].clicks += qty;
              totalSub2Clicks += qty;
          }
      });

      filteredSales.forEach(s => {
          const brand = (s.sub_id4 || '').toLowerCase();
          const shop = (s.shop_name || '').toLowerCase();
          const isDirect = shop.includes(brand) || brand.includes(shop);

          if (isDirect) {
              const rawS2 = s.sub_id2 || '-';
              const s2 = normalizeSubId2(rawS2); 
              const s3 = s.sub_id3 || '-';
              
              if (selectedSubId2ForAnalysis === 'All' || s2 === selectedSubId2ForAnalysis) {
                  directSales.push({ ...s, sub_id2: s2 }); 
                  totalDirectVal += s.order_value;
                  totalDirectQty += s.quantity;
                  
                  const key3 = `${s2}|${s3}`;
                  if (!sub3Map[key3]) sub3Map[key3] = { sub_id2: s2, name: s3, count: 0, value: 0, quantity: 0, clicks: 0, products: {} };
                  sub3Map[key3].count += 1;
                  sub3Map[key3].value += s.order_value;
                  const pName = s.product_name || 'Unknown';
                  sub3Map[key3].products[pName] = (sub3Map[key3].products[pName] || 0) + s.quantity;
              }

              if (!sub2Map[s2]) sub2Map[s2] = { count: 0, value: 0, quantity: 0, clicks: 0 };
              sub2Map[s2].count += 1;
              sub2Map[s2].value += s.order_value;

          } else {
              indirectSales.push(s);
          }
      });

      const sub2List = Object.entries(sub2Map).map(([k, v]) => ({ sub_id2: k, ...v })).sort((a,b) => b.clicks - a.clicks);
      const sub3List = Object.values(sub3Map)
          .sort((a,b) => b.count - a.count)
          .map(i => ({
              ...i,
              conversion_rate: i.clicks ? (i.count / i.clicks * 100) : 0,
              topProducts: Object.entries(i.products).map(([n, q]) => ({ name: n, qty: q })).sort((a,b) => b.qty - a.qty)
          }));

      const clickReportMap = {};
      filteredClicks.forEach(c => {
          const s2 = normalizeSubId2(c.sub_id2); 
          if (selectedSubId2ForAnalysis !== 'All' && s2 !== selectedSubId2ForAnalysis) return;

          const ref = c.referrer || '-';
          const k = `${ref}|${s2}|${c.sub_id3}`;
          if (!clickReportMap[k]) clickReportMap[k] = { referrer: ref, sub_id2: s2, sub_id3: c.sub_id3, clicks: 0 };
          clickReportMap[k].clicks += (c.quantity || 1);
      });
      const clickReport = Object.values(clickReportMap).sort((a,b) => b.clicks - a.clicks);
      
      const totalClicks = selectedSubId2ForAnalysis === 'All' 
          ? sub2List.reduce((s, i) => s + i.clicks, 0) 
          : totalSub2Clicks;

      return {
          directSales, indirectSales, totalDirectVal, totalDirectItems: totalDirectQty,
          sub2List, sub3List, clickReport,
          totalSub3Orders: sub3List.reduce((s, i) => s + i.count, 0),
          totalSub3Clicks: totalClicks,
          totalSub3Value: sub3List.reduce((s, i) => s + i.value, 0),
          avgSubId3CVR: totalClicks > 0 
            ? (sub3List.reduce((s, i) => s + i.count, 0) / totalClicks * 100) 
            : 0
      };
  }, [filteredSales, filteredClicks, selectedSubId2ForAnalysis]);

  const comparisonStats = useMemo(() => {
      let maxTs = 0;
      filteredSales.forEach(s => {
          const t = new Date(s.raw_date || 0).getTime();
          if (t > maxTs) maxTs = t;
      });
      if (maxTs === 0) return null; 

      const currentEndDate = new Date(maxTs);
      const currentStartDate = new Date(maxTs - (30 * 24 * 60 * 60 * 1000));
      const prevEndDate = new Date(currentStartDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - (30 * 24 * 60 * 60 * 1000));

      const brandSales = salesData.filter(d => d.sub_id4 && d.sub_id4.toLowerCase() === selectedBrand.toLowerCase());
      
      const getSum = (start, end) => {
          return brandSales.reduce((acc, s) => {
              const t = new Date(s.raw_date || 0).getTime();
              const brand = s.sub_id4.toLowerCase();
              const shop = s.shop_name.toLowerCase();
              const isDirect = shop.includes(brand) || brand.includes(shop);
              
              const s2 = normalizeSubId2(s.sub_id2);
              if (selectedSubId2ForAnalysis !== 'All' && s2 !== selectedSubId2ForAnalysis) return acc;

              if (t >= start.getTime() && t <= end.getTime() && isDirect) {
                  return acc + s.order_value;
              }
              return acc;
          }, 0);
      };

      const currSum = getSum(currentStartDate, currentEndDate);
      const prevSum = getSum(prevStartDate, prevEndDate);

      if (prevSum === 0) return { value: 100, isPositive: true }; 
      const diff = ((currSum - prevSum) / prevSum) * 100;
      return { value: Math.abs(diff).toFixed(1), isPositive: diff >= 0 };
  }, [salesData, selectedBrand, filteredSales, selectedSubId2ForAnalysis]);

  const sortedDirect = useMemo(() => sortData(stats.directSales), [stats.directSales, sortConfig]);
  const sortedSub2 = useMemo(() => sortData(stats.sub2List), [stats.sub2List, sortConfig]);
  const sortedSub3 = useMemo(() => sortData(stats.sub3List), [stats.sub3List, sortConfig]);
  const sortedClickReport = useMemo(() => sortData(stats.clickReport), [stats.clickReport, sortConfig]);
  
  const clickReportSub2Options = useMemo(() => {
      const unique = new Set(stats.clickReport.map(i => i.sub_id2));
      return ['All', ...Array.from(unique).sort()];
  }, [stats.clickReport]);

  const displayedClickReport = useMemo(() => {
      if (clickTableSub2Filter === 'All') return sortedClickReport;
      return sortedClickReport.filter(i => i.sub_id2 === clickTableSub2Filter);
  }, [sortedClickReport, clickTableSub2Filter]);

  const chartData = useMemo(() => {
      return stats.sub2List
        .sort((a,b) => b.clicks - a.clicks)
        .slice(0, 10)
        .map(i => ({ name: i.sub_id2, clicks: i.clicks }));
  }, [stats.sub2List]);

  // --- ERROR STATE: Missing Config ---
  if (initError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 font-sans p-4">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full border border-slate-200 text-center">
                  <div className="mb-4 bg-red-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                      <Database className="text-red-500" size={40} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h2>
                  <p className="text-slate-500 mb-6">{initError}</p>
                  <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded border">
                      สาเหตุ: Browser นี้ไม่ได้รับสิทธิ์เข้าถึงฐานข้อมูลโดยตรง (Missing Secrets)
                      <br/>
                      วิธีแก้: กรุณาแจ้ง Admin หรือเจ้าของลิงก์ให้ตรวจสอบการตั้งค่า "Secrets"
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: LOGIN SCREEN (Gatekeeper) ---
  if (!isGlobalAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
              <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-slate-200">
                  <div className="flex justify-center mb-6">
                      <div className="p-4 bg-blue-50 rounded-full">
                          <Lock className="text-blue-600" size={32} />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center mb-1 text-slate-800">KC Dashboard</h2>
                  <p className="text-center text-slate-500 mb-6 text-sm">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
                  
                  <form onSubmit={handleGlobalLogin} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1 ml-1">Username</label>
                          <div className="relative">
                              <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                              <input 
                                  type="text" 
                                  value={globalUsername}
                                  onChange={e => setGlobalUsername(e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                  placeholder="Enter username"
                                  autoFocus
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1 ml-1">Password</label>
                          <div className="relative">
                              <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                              <input 
                                  type="password" 
                                  value={globalPassword}
                                  onChange={e => setGlobalPassword(e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                  placeholder="Enter password"
                              />
                          </div>
                      </div>
                      <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200 transition-all active:scale-95">
                          เข้าสู่ระบบ
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // --- RENDER: DASHBOARD (Authenticated) ---
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-orange-500 to-red-500 p-2 rounded-lg text-white shadow-lg shadow-orange-200"><ShoppingBag size={20} /></div>
            <div>
                <span className="font-bold text-lg block leading-none">Affiliate Dashboard Shopee</span>
                <span className="text-xs text-green-600 font-medium flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online Real-time (Public)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {adminUser ? (
                <div className="flex items-center gap-2 mr-2 bg-slate-100 rounded-full px-3 py-1">
                    <span className="text-xs font-bold text-slate-600">Admin: {adminUser.username}</span>
                    <button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut size={14}/></button>
                </div>
            ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mr-2 px-3 py-1 rounded hover:bg-slate-50">
                    <LogIn size={16}/> Staff Login
                </button>
            )}

            <button onClick={handleGlobalLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded mr-1" title="ออกจากระบบ (Dashboard)"><LogOut size={18} /></button>

            <button onClick={requestDelete} className="p-2 text-red-500 hover:bg-red-50 rounded" title="ลบข้อมูลทั้งหมด (Admin Only)"><Trash2 size={18} /></button>
            
            <button onClick={handleResetFilters} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" title="รีเซ็ตตัวกรอง"><RefreshCw size={18} /></button>

            <label className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-blue-200 shadow-md ${uploading ? 'opacity-50' : ''}`}>
              <Upload size={18} className="mr-2" />
              <span className="text-sm font-medium">อัปโหลด (Admin)</span>
              <input type="file" accept=".csv" onChange={handleUniversalUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl border print:hidden shadow-sm">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {brands.map(b => (
                    <button key={b} onClick={() => setSelectedBrand(b)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${selectedBrand === b ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>{b}</button>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
               <span className="text-sm text-slate-500">เลือกเดือน:</span>
               <select value={selectedMonth} onChange={handleMonthChange} className="border rounded px-2 py-1 text-sm bg-slate-50 hover:bg-white transition-colors">
                   <option value="All">ทั้งหมด</option>
                   {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
               </select>
               <span className="text-slate-300">|</span>
               <span className="text-sm text-slate-500">วันที่:</span>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm bg-slate-50" />
               <span>-</span>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm bg-slate-50" />
            </div>
        </div>

        <div className="flex justify-between items-end text-xs text-slate-400">
            <div className="flex gap-2">
                <span>Sales: {filteredSales.length.toLocaleString()}</span>
                <span>|</span>
                <span>Clicks: {stats.totalSub3Clicks.toLocaleString()}</span>
            </div>
            <div className="text-right">
              อัปเดตล่าสุด: Sales {latestInfo.sales} | Clicks {latestInfo.clicks}
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="ยอดขายรวม (Direct)" value={formatCurrency(stats.totalDirectVal)} icon={DollarSign} colorClass="bg-emerald-500" comparison={comparisonStats} />
            <StatCard title="ยอดคลิกรวม" value={stats.totalSub3Clicks.toLocaleString()} icon={MousePointerClick} colorClass="bg-orange-500" />
            <StatCard title="จำนวนชิ้น (Direct)" value={stats.totalDirectItems.toLocaleString()} icon={ShoppingBag} colorClass="bg-blue-500" />
            <StatCard title="Conversion Rate" value={`${stats.avgSubId3CVR.toFixed(2)}%`} icon={BarChart2} colorClass="bg-purple-500" />
        </div>

        {/* Clicks Graph */}
        <Card className="p-6">
            <h3 className="font-bold text-slate-800 mb-4">ยอดคลิกสูงสุด 10 อันดับ (Sub_id2)</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="clicks" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* Click Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 overflow-hidden">
                <div className="px-4 py-3 border-b bg-blue-50 text-blue-800 font-semibold">สรุปตาม Sub_id2</div>
                <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm relative">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm"><tr><SortHeader label="Sub_id2" k="sub_id2"/><SortHeader label="Clicks" k="clicks" align="right"/></tr></thead>
                        <tbody>{sortedSub2.map((i,x)=><tr key={x}><td className="px-4 py-2">{i.sub_id2}</td><td className="px-4 py-2 text-right font-bold text-blue-600">{i.clicks.toLocaleString()}</td></tr>)}</tbody>
                        <tfoot className="bg-blue-50 font-bold sticky bottom-0 z-10 shadow-inner"><tr><td className="px-4 py-2 text-right">รวม</td><td className="px-4 py-2 text-right">{stats.sub2List.reduce((s,i)=>s+i.clicks,0).toLocaleString()}</td></tr></tfoot>
                    </table>
                </div>
            </Card>
            <Card className="lg:col-span-2 overflow-hidden">
                <div className="px-4 py-2 border-b bg-blue-50 flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <span className="font-semibold text-blue-800">รายงานยอดคลิก (ละเอียด)</span>
                        <select 
                            value={clickTableSub2Filter} 
                            onChange={(e) => setClickTableSub2Filter(e.target.value)}
                            className="ml-2 border rounded px-2 py-1 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">All Sub_id2</option>
                            {clickReportSub2Options.filter(x => x !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="p-1 hover:bg-blue-100 rounded" title="Ctrl+P"><Printer size={16} /></button>
                        <button onClick={() => exportToCSV(stats.clickReport, 'ClickReport.csv')} className="p-1 hover:bg-blue-100 rounded"><Download size={16} /></button>
                    </div>
                </div>
                <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm"><tr><SortHeader label="Ref" k="referrer"/><SortHeader label="Sub 2" k="sub_id2"/><SortHeader label="Sub 3" k="sub_id3"/><SortHeader label="Clicks" k="clicks" align="right"/></tr></thead>
                        <tbody>{displayedClickReport.map((i,x)=><tr key={x} className="hover:bg-slate-50"><td className="px-4 py-2 text-slate-500">{i.referrer}</td><td className="px-4 py-2">{i.sub_id2}</td><td className="px-4 py-2">{i.sub_id3}</td><td className="px-4 py-2 text-right font-bold text-blue-600">{i.clicks.toLocaleString()}</td></tr>)}</tbody>
                        <tfoot className="bg-blue-50 font-bold sticky bottom-0 z-10 shadow-inner"><tr><td colSpan={3} className="px-4 py-2 text-right">รวมทั้งหมด</td><td className="px-4 py-2 text-right">{displayedClickReport.reduce((s,i)=>s+i.clicks,0).toLocaleString()}</td></tr></tfoot>
                    </table>
                </div>
            </Card>
        </div>

        {/* Sales Analysis */}
        <div className="space-y-2">
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-100">
                <h3 className="font-bold text-purple-900 flex items-center gap-2"><div className="w-2 h-6 bg-purple-500 rounded"></div> วิเคราะห์ยอดขาย (เจาะลึก)</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-700 font-medium">กรองตาม Sub_id2:</span>
                    <select value={selectedSubId2ForAnalysis} onChange={e => setSelectedSubId2ForAnalysis(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-[150px]"><option value="All">ทั้งหมด</option>{stats.sub2List.map(s => <option key={s.sub_id2} value={s.sub_id2}>{s.sub_id2}</option>)}</select>
                </div>
            </div>
            <Card className="overflow-hidden">
                <div className="overflow-auto max-h-96">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <SortHeader label="Sub_id2" k="sub_id2"/>
                                <SortHeader label="Sub_id3" k="name"/>
                                <SortHeader label="Clicks" k="clicks" align="center"/>
                                <SortHeader label="Orders" k="count" align="center"/>
                                <SortHeader label="CVR" k="conversion_rate" align="center"/>
                                <SortHeader label="ยอดขาย" k="value" align="right"/>
                                {/* ขยายความกว้างของคอลัมน์ Top Product */}
                                <th className="px-6 py-3 w-5/12">Top Product</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sortedSub3.map((i,x) => (
                                <tr key={x} className="hover:bg-slate-50">
                                    <td className="px-6 py-2 text-slate-500 align-top">{i.sub_id2}</td>
                                    <td className="px-6 py-2 font-medium align-top">{i.name}</td>
                                    <td className="px-6 py-2 text-center text-slate-500 align-top">{i.clicks.toLocaleString()}</td>
                                    <td className="px-6 py-2 text-center font-bold text-purple-700 align-top">{i.count}</td>
                                    <td className="px-6 py-2 text-center font-bold text-blue-600 align-top">{i.conversion_rate.toFixed(1)}%</td>
                                    <td className="px-6 py-2 text-right font-medium text-emerald-600 align-top">{formatCurrency(i.value)}</td>
                                    <td className="px-6 py-2">
                                        <ProductListCell products={i.topProducts} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-purple-50 font-bold text-purple-900 border-t border-purple-100 sticky bottom-0 z-10 shadow-inner">
                            <tr>
                                <td colSpan={2} className="px-6 py-2 text-right">รวม</td>
                                <td className="px-6 py-2 text-center">{stats.totalSub3Clicks.toLocaleString()}</td>
                                <td className="px-6 py-2 text-center">{stats.totalSub3Orders.toLocaleString()}</td>
                                <td className="px-6 py-2 text-center">{stats.avgSubId3CVR.toFixed(2)}%</td>
                                <td className="px-6 py-2 text-right">{formatCurrency(stats.totalSub3Value)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>

        {/* Direct Sales List */}
        <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 font-semibold text-emerald-800 flex justify-between items-center">
                <span>รายการขายล่าสุด (Direct)</span>
                <button onClick={handleExportAll} className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors">
                    <Download size={14} /> Export CSV All
                </button>
            </div>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-sm text-left relative">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <SortHeader label="วันที่" k="order_date"/>
                            <SortHeader label="Sub 2" k="sub_id2"/>
                            <SortHeader label="Sub 3" k="sub_id3"/>
                            <SortHeader label="สินค้า" k="product_name"/>
                            <SortHeader label="มูลค่า" k="order_value" align="right"/>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedDirect.slice(0,50).map((i,x) => (
                            <tr key={x}>
                                <td className="px-6 py-2 whitespace-nowrap text-slate-500">{i.order_date}</td>
                                <td className="px-6 py-2 text-slate-600">{i.sub_id2}</td>
                                <td className="px-6 py-2 text-slate-500">{i.sub_id3}</td>
                                <td className="px-6 py-2 truncate max-w-xs" title={i.product_name}>
                                    {shortenProductName(i.product_name)} 
                                    <span className="text-xs text-slate-300 ml-2 hidden group-hover:inline">{i.product_name}</span>
                                </td>
                                <td className="px-6 py-2 text-right font-medium text-emerald-600">{formatCurrency(i.order_value)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
                <div className="mb-4 bg-red-100 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-800">ยืนยันลบข้อมูลทั้งหมด?</h3>
                <p className="text-sm text-slate-500 mb-6">
                    การกระทำนี้โดย <b>{adminUser?.username}</b> จะลบข้อมูลสาธารณะทั้งหมด <br/>
                    ไม่สามารถกู้คืนได้
                </p>
                <div className="flex gap-2 justify-center mt-4">
                    <button onClick={() => setShowDeleteModal(false)} className="py-2 px-4 bg-slate-100 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition-colors">ยกเลิก</button>
                    <button onClick={handleClearData} className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-red-200 shadow-lg">ยืนยันลบ</button>
                </div>
            </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex justify-center mb-4 text-blue-600">
                    <ShieldAlert size={40} />
                </div>
                <h3 className="font-bold text-xl mb-1 text-center text-slate-800">Admin Authentication</h3>
                <p className="text-center text-sm text-slate-500 mb-6">กรุณาเข้าสู่ระบบเพื่อดำเนินการ {pendingAction === 'delete' ? 'ลบข้อมูล' : 'อัปโหลดไฟล์'}</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={loginUsername} 
                            onChange={e => setLoginUsername(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Enter username"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            value={loginPassword} 
                            onChange={e => setLoginPassword(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Enter password"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => { setShowLoginModal(false); setPendingAction(null); }} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">ยกเลิก</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-200">เข้าสู่ระบบ</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}