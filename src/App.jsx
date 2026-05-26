import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw,
  ShoppingBag,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Lock,
  User,
  LogOut,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_SHEET_API_URL || '';
const DASHBOARD_USERS = import.meta.env.VITE_DASHBOARD_USERS || 'adminkc:kcadmin,mindshift:mindshift';

function parseUsers(value) {
  return value
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [username, password] = pair.split(':');
      return {
        username: String(username || '').trim().toLowerCase(),
        password: String(password || '').trim().toLowerCase(),
      };
    });
}

function normalizeMonth(value) {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/\d{4}-\d{2}/);
  return match ? match[0] : text;
}

function normalizeDate(value) {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat('th-TH').format(toNumber(value));
}

function formatPercent(value) {
  const n = toNumber(value);
  return `${(n * 100).toFixed(2)}%`;
}

function splitTopProducts(value) {
  const text = String(value || '').trim();
  if (!text || text === '-') return [];
  return text
    .split(/\),\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.endsWith(')') ? part : `${part})`));
}

function getSortValue(row, key) {
  const numericKeys = new Set([
    'clicks',
    'orders',
    'quantity',
    'sales_value',
    'total_clicks',
    'total_orders',
    'total_quantity',
    'total_sales',
    'conversion_rate',
  ]);
  if (numericKeys.has(key)) return toNumber(row[key]);
  return String(row[key] ?? '').toLowerCase();
}

function sortRows(rows, sortConfig) {
  if (!sortConfig?.key) return rows;
  const { key, direction } = sortConfig;
  return [...rows].sort((a, b) => {
    const av = getSortValue(a, key);
    const bv = getSortValue(b, key);
    if (av < bv) return direction === 'ascending' ? -1 : 1;
    if (av > bv) return direction === 'ascending' ? 1 : -1;
    return 0;
  });
}

function nextSort(current, key) {
  if (current.key === key) {
    return { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' };
  }
  return { key, direction: 'descending' };
}

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
);

const StatCard = ({ title, value, icon: Icon, subText, className = '' }) => (
  <Card className={`p-5 ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
        {subText ? <p className="mt-2 text-xs text-slate-400">{subText}</p> : null}
      </div>
      <div className="rounded-2xl bg-slate-900 p-3 text-white">
        <Icon size={22} />
      </div>
    </div>
  </Card>
);

function SortHeader({ label, sortKey, sortConfig, onSort, align = 'left' }) {
  const active = sortConfig.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-${align} hover:bg-slate-100`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {active ? (
          sortConfig.direction === 'ascending' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
        ) : (
          <ArrowUpDown size={13} className="opacity-40" />
        )}
      </div>
    </th>
  );
}

function TopProductCell({ value }) {
  const items = splitTopProducts(value);
  if (!items.length) return <span className="text-slate-400">-</span>;

  return (
    <div className="flex max-w-[420px] flex-col gap-1.5 text-xs leading-relaxed">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-lg bg-slate-50 px-2 py-1 text-slate-700">
          {item}
        </div>
      ))}
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const users = parseUsers(DASHBOARD_USERS);
    const found = users.some(
      (u) => u.username === username.trim().toLowerCase() && u.password === password.trim().toLowerCase()
    );

    if (!found) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      return;
    }

    localStorage.setItem('kc_dashboard_v2_auth', 'true');
    onLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Lock size={30} />
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">KC Dashboard V2</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Google Sheet API Version</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-slate-900"
                placeholder="Enter username"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-10 pr-3 outline-none focus:border-slate-900"
                placeholder="Enter password"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white hover:bg-slate-700">
            เข้าสู่ระบบ
          </button>
        </form>
      </Card>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('kc_dashboard_v2_auth') === 'true');
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Tulip');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedSubId2, setSelectedSubId2] = useState('All');
  const [search, setSearch] = useState('');
  const [dailySort, setDailySort] = useState({ key: 'date', direction: 'descending' });
  const [sub2Sort, setSub2Sort] = useState({ key: 'clicks', direction: 'descending' });
  const [sub3Sort, setSub3Sort] = useState({ key: 'sales_value', direction: 'descending' });

  const fetchData = async () => {
    if (!API_URL) {
      setError('ยังไม่ได้ตั้งค่า VITE_SHEET_API_URL ใน Vercel');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error('API returned success=false');
      setApiData(json.data || {});
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated]);

  useEffect(() => {
    setSelectedSubId2('All');
    setSearch('');
  }, [selectedBrand, selectedMonth]);

  const monthly = useMemo(() => (apiData?.summary_monthly || []).map((x) => ({ ...x, month: normalizeMonth(x.month) })), [apiData]);
  const daily = useMemo(() => (apiData?.summary_daily || []).map((x) => ({ ...x, date: normalizeDate(x.date), month: normalizeMonth(x.date) })), [apiData]);
  const subid2 = useMemo(() => (apiData?.summary_subid2 || []).map((x) => ({ ...x, month: normalizeMonth(x.month) })), [apiData]);
  const subid3 = useMemo(() => (apiData?.summary_subid3 || []).map((x) => ({ ...x, month: normalizeMonth(x.month) })), [apiData]);

  const brands = useMemo(() => {
    const set = new Set(monthly.map((x) => x.brand).filter(Boolean));
    return Array.from(set).length ? Array.from(set) : ['Tulip', 'Jessica', 'Fountain'];
  }, [monthly]);

  const months = useMemo(() => {
    const set = new Set(monthly.map((x) => x.month).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [monthly]);

  const filteredMonthly = useMemo(() => {
    return monthly.filter((x) => {
      if (selectedBrand !== 'All' && x.brand !== selectedBrand) return false;
      if (selectedMonth !== 'All' && x.month !== selectedMonth) return false;
      return true;
    });
  }, [monthly, selectedBrand, selectedMonth]);

  const filteredDaily = useMemo(() => {
    const rows = daily.filter((x) => {
      if (selectedBrand !== 'All' && x.brand !== selectedBrand) return false;
      if (selectedMonth !== 'All' && x.month !== selectedMonth) return false;
      return true;
    });
    return sortRows(rows, dailySort);
  }, [daily, selectedBrand, selectedMonth, dailySort]);

  const baseSub2 = useMemo(() => {
    return subid2.filter((x) => {
      if (selectedBrand !== 'All' && x.brand !== selectedBrand) return false;
      if (selectedMonth !== 'All' && x.month !== selectedMonth) return false;
      return true;
    });
  }, [subid2, selectedBrand, selectedMonth]);

  const filteredSub2 = useMemo(() => sortRows(baseSub2, sub2Sort), [baseSub2, sub2Sort]);

  const subId2Options = useMemo(() => {
    const set = new Set(baseSub2.map((x) => x.sub_id2).filter(Boolean));
    return Array.from(set).sort();
  }, [baseSub2]);

  const filteredSub3 = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = subid3.filter((x) => {
      if (selectedBrand !== 'All' && x.brand !== selectedBrand) return false;
      if (selectedMonth !== 'All' && x.month !== selectedMonth) return false;
      if (selectedSubId2 !== 'All' && x.sub_id2 !== selectedSubId2) return false;
      if (!q) return true;
      return [x.sub_id2, x.sub_id3, x.top_product].some((v) => String(v || '').toLowerCase().includes(q));
    });
    return sortRows(rows, sub3Sort);
  }, [subid3, selectedBrand, selectedMonth, selectedSubId2, search, sub3Sort]);

  const totals = useMemo(() => {
    return filteredMonthly.reduce(
      (acc, row) => {
        acc.clicks += toNumber(row.total_clicks);
        acc.orders += toNumber(row.total_orders);
        acc.quantity += toNumber(row.total_quantity);
        acc.sales += toNumber(row.total_sales);
        return acc;
      },
      { clicks: 0, orders: 0, quantity: 0, sales: 0 }
    );
  }, [filteredMonthly]);

  const conversionRate = totals.clicks ? totals.orders / totals.clicks : 0;

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-bold leading-tight">KC Affiliate Dashboard V2</h1>
            <p className="text-xs text-slate-500">Google Sheet Summary API</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('kc_dashboard_v2_auth');
                setAuthenticated(false);
              }}
              className="rounded-xl p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              title="ออกจากระบบ"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {error ? (
          <Card className="border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} /> {error}</div>
          </Card>
        ) : null}

        <Card className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBrand('All')}
                className={`rounded-xl px-4 py-2 text-sm font-medium ${selectedBrand === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                ทั้งหมด
              </button>
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${selectedBrand === brand ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="All">ทุกเดือน</option>
                {months.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา Sub ID / Product"
                  className="w-56 rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard title="ยอดขายรวม" value={formatCurrency(totals.sales)} icon={DollarSign} />
          <StatCard title="ยอดคลิก" value={formatNumber(totals.clicks)} icon={MousePointerClick} />
          <StatCard title="ออเดอร์" value={formatNumber(totals.orders)} icon={ShoppingBag} />
          <StatCard title="Conversion Rate" value={formatPercent(conversionRate)} icon={TrendingUp} />
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">ยอดคลิกตาม Sub_id2</h2>
            <span className="text-xs text-slate-400">Top 10</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSub2.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="sub_id2" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="clicks" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-bold">ยอดขายสินค้าแต่ละแบรนด์รายวัน</div>
            <div className="text-xs text-slate-400">คลิกหัวตารางเพื่อ Sort</div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-left text-slate-500 shadow-sm">
                <tr>
                  <SortHeader label="วันที่" sortKey="date" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} />
                  <SortHeader label="Brand" sortKey="brand" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} />
                  <SortHeader label="Clicks" sortKey="total_clicks" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} align="right" />
                  <SortHeader label="Orders" sortKey="total_orders" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} align="right" />
                  <SortHeader label="Quantity" sortKey="total_quantity" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} align="right" />
                  <SortHeader label="Sales" sortKey="total_sales" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} align="right" />
                  <SortHeader label="CVR" sortKey="conversion_rate" sortConfig={dailySort} onSort={(key) => setDailySort((s) => nextSort(s, key))} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDaily.length ? filteredDaily.map((row, idx) => (
                  <tr key={`${row.date}-${row.brand}-${idx}`} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.date}</td>
                    <td className="px-4 py-3 font-medium">{row.brand}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.total_clicks)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.total_orders)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(row.total_quantity)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(row.total_sales)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatPercent(row.conversion_rate)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">ยังไม่มีข้อมูลรายวัน ให้เพิ่ม summary_daily ใน Apps Script แล้ว Rebuild Summary</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden lg:col-span-1">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold">สรุป Sub_id2</div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-slate-500 shadow-sm">
                  <tr>
                    <SortHeader label="Sub_id2" sortKey="sub_id2" sortConfig={sub2Sort} onSort={(key) => setSub2Sort((s) => nextSort(s, key))} />
                    <SortHeader label="Clicks" sortKey="clicks" sortConfig={sub2Sort} onSort={(key) => setSub2Sort((s) => nextSort(s, key))} align="right" />
                    <SortHeader label="Orders" sortKey="orders" sortConfig={sub2Sort} onSort={(key) => setSub2Sort((s) => nextSort(s, key))} align="right" />
                    <SortHeader label="CVR" sortKey="conversion_rate" sortConfig={sub2Sort} onSort={(key) => setSub2Sort((s) => nextSort(s, key))} align="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSub2.map((row, idx) => (
                    <tr
                      key={`${row.month}-${row.brand}-${row.sub_id2}-${idx}`}
                      onClick={() => setSelectedSubId2(row.sub_id2)}
                      className={`cursor-pointer hover:bg-slate-50 ${selectedSubId2 === row.sub_id2 ? 'bg-blue-50' : ''}`}
                      title="คลิกเพื่อกรองตาราง Sub_id3"
                    >
                      <td className="px-4 py-3 font-medium">{row.sub_id2}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.orders)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatPercent(row.conversion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden lg:col-span-2">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="font-bold">สรุป Sub_id3 + Top Product</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">เลือก Sub_id2:</span>
                <select
                  value={selectedSubId2}
                  onChange={(e) => setSelectedSubId2(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="All">ทั้งหมด</option>
                  {subId2Options.map((sub2) => <option key={sub2} value={sub2}>{sub2}</option>)}
                </select>
                {selectedSubId2 !== 'All' ? (
                  <button
                    onClick={() => setSelectedSubId2('All')}
                    className="flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-300"
                  >
                    <X size={12} /> ล้างตัวกรอง
                  </button>
                ) : null}
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-slate-500 shadow-sm">
                  <tr>
                    <SortHeader label="Month" sortKey="month" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} />
                    <SortHeader label="Brand" sortKey="brand" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} />
                    <SortHeader label="Sub_id2" sortKey="sub_id2" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} />
                    <SortHeader label="Sub_id3" sortKey="sub_id3" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} />
                    <SortHeader label="Clicks" sortKey="clicks" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} align="right" />
                    <SortHeader label="Orders" sortKey="orders" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} align="right" />
                    <SortHeader label="Sales" sortKey="sales_value" sortConfig={sub3Sort} onSort={(key) => setSub3Sort((s) => nextSort(s, key))} align="right" />
                    <th className="px-4 py-3">Top Product</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSub3.map((row, idx) => (
                    <tr key={`${row.month}-${row.brand}-${row.sub_id2}-${row.sub_id3}-${idx}`} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.month}</td>
                      <td className="px-4 py-3">{row.brand}</td>
                      <td className="px-4 py-3">{row.sub_id2}</td>
                      <td className="px-4 py-3 font-medium">{row.sub_id3}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(row.orders)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(row.sales_value)}</td>
                      <td className="min-w-[320px] px-4 py-3"><TopProductCell value={row.top_product} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
