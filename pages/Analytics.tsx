
import React, { useMemo } from 'react';
import { MessSystemDB } from '../types';
import { getCalculations } from '../db';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Users, Calendar } from 'lucide-react';

interface AnalyticsProps {
  db: MessSystemDB;
}

const Analytics: React.FC<AnalyticsProps> = ({ db }) => {
  // ক্যালেন্ডার বছরের ডাটা সংগ্রহ করা হচ্ছে (জানুয়ারি থেকে ডিসেম্বর)
  const yearlyData = useMemo(() => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    for (let i = 0; i < 12; i++) {
      const mStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const stats = getCalculations(db, mStr);
      months.push({
        month: mStr,
        monthName: monthNames[i],
        mealRate: stats.mealRate,
        totalBazar: stats.totalBazar,
        totalMeals: stats.totalMeals,
        userStats: stats.userStats
      });
    }
    return months;
  }, [db]);

  // ২. মার্কেট কন্ট্রিবিউশন সারা বছরব্যাপী (ব্যবহারকারী ভিত্তিক)
  const userYearlyContribution = useMemo(() => {
    const residents = db.users.filter(u => !u.isAdmin);
    return residents.map(user => {
      const total = db.bazars.filter(b => b.userId === user.id).reduce((s, b) => s + b.amount, 0) +
                    db.payments.filter(p => p.userId === user.id).reduce((s, p) => s + p.amount, 0);
      return {
        name: user.name,
        amount: total
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [db]);

  // ৩. ইউটিলিটি ব্রেকডাউন (সমস্ত ইউটিলিটির টোটাল এভারেজ)
  const utilityBreakdown = useMemo(() => {
    return db.utilities.map(u => ({
      name: u.name,
      value: u.amount
    }));
  }, [db.utilities]);

  // ৪. মেম্বার প্রতি মাসে মিল সংখ্যা তুলনা
  const mealConsumptionTrend = useMemo(() => {
    const residents = db.users.filter(u => !u.isAdmin).slice(0, 5); // প্রথম ৫ জনের ডাটা
    return yearlyData.map(d => {
      const entry: any = { month: d.month, monthName: d.monthName };
      residents.forEach(r => {
        const uStat = d.userStats.find(us => us.userId === r.id);
        entry[r.name] = uStat ? uStat.totalMeals : 0;
      });
      return entry;
    });
  }, [yearlyData, db.users]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
          <BarChart3 size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white">বার্ষিক অ্যানালিটিক্স</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">স্বয়ংক্রিয় ডাটা ভিজ্যুয়ালাইজেশন ও ট্রেন্ড</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Yearly Meal Rate Trend Graph */}
        <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
          <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
            <TrendingUp size={20} className="text-blue-500" />
            বার্ষিক মিল রেট ট্রেন্ড (জানুয়ারি - ডিসেম্বর)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="monthName" fontSize={10} stroke="#6b7280" interval={0} />
                <YAxis fontSize={10} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mealRate" 
                  name="মিল রেট"
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Total Contribution */}
        <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
          <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
            <Users size={20} className="text-green-500" />
            বার্ষিক বাজার কন্ট্রিবিউশন
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userYearlyContribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1f2937" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} stroke="#6b7280" width={80} />
                <Tooltip cursor={{ fill: '#1f2937' }} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Bar dataKey="amount" fill="#10b981" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meal Consumption Analysis */}
        <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
          <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
            <Calendar size={20} className="text-purple-500" />
            মাসিক মিলের তুলনা (শীর্ষ ৫ মেম্বার)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mealConsumptionTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis dataKey="monthName" fontSize={10} stroke="#6b7280" interval={0} />
                <YAxis fontSize={10} stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                {db.users.filter(u => !u.isAdmin).slice(0, 5).map((user, idx) => (
                  <Area key={user.id} type="monotone" dataKey={user.name} stackId="1" stroke={COLORS[idx % COLORS.length]} fill={COLORS[idx % COLORS.length]} fillOpacity={0.2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Utility Pie Chart */}
        <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
          <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
            <PieIcon size={20} className="text-yellow-500" />
            ইউটিলিটি খরচ ব্রেকডাউন (%)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={utilityBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {utilityBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
