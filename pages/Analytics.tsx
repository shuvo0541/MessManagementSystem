
import React, { useMemo } from 'react';
import { MessSystemDB, User } from '../types';
import { getCalculations } from '../db';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Users, Calendar } from 'lucide-react';

interface AnalyticsProps {
  db: MessSystemDB;
  user: User;
}

const Analytics: React.FC<AnalyticsProps> = ({ db, user }) => {
  const currentYear = new Date().getFullYear();

  // ১. ক্যালেন্ডার বছরের ডাটা সংগ্রহ (জানুয়ারি থেকে ডিসেম্বর)
  const yearlyData = useMemo(() => {
    const months = [];
    const monthNames = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];

    for (let i = 0; i < 12; i++) {
      const mStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      
      // মেম্বারদের জন্য শুধুমাত্র তাদের অ্যাক্টিভ মাসগুলোর ডাটা প্রসেস করা
      if (!user.isAdmin) {
        if (user.joiningMonth && mStr < user.joiningMonth) continue;
        if (user.leavingMonth && mStr > user.leavingMonth) continue;
      }

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
  }, [db, currentYear, user]);

  // ২. বার্ষিক বাজার কন্ট্রিবিউশন
  const userYearlyContribution = useMemo(() => {
    const residents = db.users; 
    return residents.map(u => {
      const total = db.bazars.filter(b => b.userId === u.id).reduce((s, b) => s + b.amount, 0) +
                    db.payments.filter(p => p.userId === u.id).reduce((s, p) => s + p.amount, 0);
      return {
        name: u.name,
        amount: total
      };
    }).filter(u => u.amount > 0).sort((a, b) => b.amount - a.amount);
  }, [db]);

  // ৩. ইউটিলিটি ব্রেকডাউন
  const utilityBreakdown = useMemo(() => {
    return db.utilities.map(u => ({
      name: u.name,
      value: u.amount
    }));
  }, [db.utilities]);

  // ৪. প্রকৃত শীর্ষ ৫ মিল গ্রহণকারী বের করা (সারা বছরের মিল যোগ করে)
  const top5Eaters = useMemo(() => {
    const userMealSums: Record<string, { id: string, name: string, total: number }> = {};
    
    db.users.forEach(u => {
      userMealSums[u.id] = { id: u.id, name: u.name, total: 0 };
    });

    db.meals.forEach(m => {
      if (m.date.startsWith(currentYear.toString()) && userMealSums[m.userId]) {
        userMealSums[m.userId].total += (m.breakfast + m.lunch + m.dinner + m.guest);
      }
    });

    return Object.values(userMealSums)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [db.users, db.meals, currentYear]);

  // ৫. মাসিক মিল ট্রেন্ড ডাটা প্রসেসিং (শীর্ষ ৫ জনের জন্য)
  const mealConsumptionTrend = useMemo(() => {
    return yearlyData.map(d => {
      const entry: any = { month: d.month, monthName: d.monthName };
      top5Eaters.forEach(r => {
        const uStat = d.userStats.find(us => us.userId === r.id);
        entry[r.name] = uStat ? uStat.totalMeals : 0;
      });
      return entry;
    });
  }, [yearlyData, top5Eaters]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
          <BarChart3 size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white">বার্ষিক অ্যানালিটিক্স</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">
             {user.isAdmin ? `${currentYear} সালের ডাটা` : `আপনার অ্যাক্টিভ মাসগুলোর ডাটা`}
          </p>
        </div>
      </div>

      {yearlyData.length === 0 ? (
        <div className="bg-gray-900 p-20 rounded-[3rem] border border-gray-800 text-center space-y-4">
           <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-600">
              <Calendar size={40} />
           </div>
           <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">এই বছরে আপনার কোনো অ্যাক্টিভ ডাটা নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Yearly Meal Rate Trend Graph */}
          <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-3 mb-8">
              <TrendingUp size={20} className="text-blue-500" />
              মিল রেট ট্রেন্ড (৳)
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="monthName" 
                    fontSize={10} 
                    stroke="#6b7280" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
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
              মোট বাজার কন্ট্রিবিউশন (৳)
            </h3>
            <div className="h-72">
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mealConsumptionTrend} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis 
                    dataKey="monthName" 
                    fontSize={10} 
                    stroke="#6b7280" 
                    interval={0} 
                    angle={-45} 
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis fontSize={10} stroke="#6b7280" />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                  {top5Eaters.map((eater, idx) => (
                    <Area 
                      key={eater.id} 
                      type="monotone" 
                      dataKey={eater.name} 
                      stroke={COLORS[idx % COLORS.length]} 
                      fill={COLORS[idx % COLORS.length]} 
                      fillOpacity={0.15} 
                      strokeWidth={2}
                    />
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
            <div className="h-80">
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
      )}
    </div>
  );
};

export default Analytics;
