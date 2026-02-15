
import { MessSystemDB, User, Role, CalcMode } from './types';
import { supabase } from './supabase';

export const INITIAL_DB: MessSystemDB = {
  users: [],
  rooms: [],
  monthlyRoomOverrides: [],
  utilities: [],
  localUtilities: [],
  monthlyUtilityOverrides: [],
  monthlyRoles: [],
  meals: [],
  bazars: [],
  extraCosts: [],
  payments: [],
  theme: 'dark'
};

export const fetchMessDB = async (messId: string): Promise<MessSystemDB> => {
  const { data, error } = await supabase
    .from('messes')
    .select('db_json')
    .eq('id', messId)
    .single();

  if (error || !data) {
    console.error('Error fetching mess DB:', error);
    return INITIAL_DB;
  }
  return data.db_json as MessSystemDB;
};

export const syncDBToSupabase = async (db: MessSystemDB, messId: string) => {
  const { error } = await supabase
    .from('messes')
    .update({ db_json: db })
    .eq('id', messId);

  if (error) {
    console.error('Error syncing DB to Supabase:', error);
  }
};

export const getLocalDateStr = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getPreviousMonthStr = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// এই ফাংশনটি নির্দিষ্ট মাসে কারা একটিভ তা নিখুঁতভাবে নির্ধারণ করে
export const getActiveResidentsInMonth = (db: MessSystemDB, month: string) => {
  return db.users.filter(u => {
    const isJoined = !u.joiningMonth || u.joiningMonth <= month;
    const isNotLeft = !u.leavingMonth || u.leavingMonth >= month;
    const isOff = u.isPermanentlyOff || (u.monthlyOff || []).includes(month);
    return isJoined && isNotLeft && !isOff;
  });
};

export const getCalculations = (db: MessSystemDB, month: string, depth = 0): any => {
  const activeResidents = getActiveResidentsInMonth(db, month);
  const activeResidentIds = new Set(activeResidents.map(u => u.id));
  const allUserIds = new Set(db.users.map(u => u.id));
  
  const monthBazars = db.bazars.filter(b => b.date.startsWith(month) && allUserIds.has(b.userId));
  const monthMeals = db.meals.filter(m => m.date.startsWith(month) && activeResidentIds.has(m.userId));
  const monthPayments = db.payments.filter(p => p.month === month && allUserIds.has(p.userId));
  
  const utilityShares: Record<string, number> = {}; 
  activeResidents.forEach(u => utilityShares[u.id] = 0);

  db.utilities.forEach(master => {
    const override = db.monthlyUtilityOverrides.find(ov => ov.utilityId === master.id && ov.month === month);
    const amount = override ? override.amount : master.amount;
    const mode = override ? override.calcMode : master.defaultCalcMode;
    const values = override ? override.calcValues : {};
    calculateUtilityShares(amount, mode, values, activeResidentIds, activeResidents, utilityShares);
  });

  (db.localUtilities || []).filter(lu => lu.month === month).forEach(local => {
    calculateUtilityShares(local.amount, local.calcMode, local.calcValues, activeResidentIds, activeResidents, utilityShares);
  });
  
  const totalBazar = monthBazars.reduce((sum, b) => sum + b.amount, 0);
  const totalMeals = monthMeals.reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner + m.guest, 0);
  const mealRate = totalMeals > 0 ? (totalBazar / totalMeals) : 0;
  
  const prevMonth = getPreviousMonthStr(month);
  const prevMonthStats = (depth < 12 && prevMonth !== month) 
    ? getCalculations(db, prevMonth, depth + 1) 
    : null;

  const userStats = db.users.map(user => {
    const isActive = activeResidentIds.has(user.id);
    const uTotalMeals = isActive 
      ? monthMeals.filter(m => m.userId === user.id).reduce((sum, m) => sum + m.breakfast + m.lunch + m.dinner + m.guest, 0)
      : 0;
    
    const uMealCost = uTotalMeals * mealRate;
    
    let uRoomRent = 0;
    if (isActive) {
      const uRoom = db.rooms.find(r => r.id === user.roomId);
      if (uRoom) {
        const roomMonthRent = db.monthlyRoomOverrides?.find(ov => ov.roomId === uRoom.id && ov.month === month)?.rent ?? uRoom.rent;
        if (uRoom.splitType === 'PERCENTAGE') {
          uRoomRent = (roomMonthRent * (user.rentShare || 0)) / 100;
        } else {
          const activeMembersInRoom = activeResidents.filter(r => r.roomId === user.roomId).length;
          uRoomRent = roomMonthRent / Math.max(1, activeMembersInRoom);
        }
      }
    }

    const uUtilityShare = isActive ? (utilityShares[user.id] || 0) : 0;
    const uCurrentMonthCost = uMealCost + uRoomRent + uUtilityShare;
    
    const uContribution = monthPayments.filter(p => p.userId === user.id).reduce((sum, p) => sum + p.amount, 0) + 
                         monthBazars.filter(b => b.userId === user.id).reduce((sum, b) => sum + b.amount, 0);

    const uPrevBalance = prevMonthStats?.userStats.find((s: any) => s.userId === user.id)?.balance || 0;
    const uNetRequired = uCurrentMonthCost - uPrevBalance;
    const uBalance = uContribution - uNetRequired;

    return {
      userId: user.id,
      name: user.name,
      isActive,
      totalMeals: uTotalMeals,
      mealCost: uMealCost,
      roomRent: uRoomRent,
      utilityShare: uUtilityShare,
      currentMonthCost: uCurrentMonthCost,
      prevAdjustment: uPrevBalance,
      netRequired: uNetRequired,
      contribution: uContribution,
      balance: uBalance,
      totalCost: uCurrentMonthCost
    };
  });

  return {
    totalBazar,
    totalMeals,
    mealRate,
    userStats
  };
};

function calculateUtilityShares(amount: number, mode: CalcMode, values: any, activeResidentIds: Set<string>, activeResidents: User[], utilityShares: Record<string, number>) {
  if (mode === CalcMode.FIXED) {
    let fixedTotal = 0;
    const fixedUserIds = new Set<string>();
    Object.entries(values).forEach(([uid, val]: [string, any]) => {
      if (activeResidentIds.has(uid)) {
        utilityShares[uid] += val;
        fixedTotal += val;
        fixedUserIds.add(uid);
      }
    });
    const remainingAmount = amount - fixedTotal;
    const remainingUsers = activeResidents.filter(r => !fixedUserIds.has(r.id));
    if (remainingUsers.length > 0) {
      const share = remainingAmount / remainingUsers.length;
      remainingUsers.forEach(r => utilityShares[r.id] += share);
    }
  } else if (mode === CalcMode.MULTIPLIER) {
    let sumMultipliers = 0;
    const multipliers: Record<string, number> = {};
    activeResidents.forEach(r => {
      const m = values[r.id] || 1.0;
      multipliers[r.id] = m;
      sumMultipliers += m;
    });
    if (sumMultipliers > 0) {
      activeResidents.forEach(r => {
        utilityShares[r.id] += (amount / sumMultipliers) * multipliers[r.id];
      });
    }
  } else {
    const share = amount / Math.max(1, activeResidents.length);
    activeResidents.forEach(r => utilityShares[r.id] += share);
  }
}

export const getUserRoleInMonth = (db: MessSystemDB, userId: string, month: string): Role => {
  const user = db.users.find(u => u.id === userId);
  if (!user) return Role.MEMBER;
  if (user.isAdmin) return Role.ADMIN;
  
  const isJoined = !user.joiningMonth || user.joiningMonth <= month;
  const isNotLeft = !user.leavingMonth || user.leavingMonth >= month;
  
  if (!isJoined || !isNotLeft) return Role.MEMBER; 
  
  const monthRole = db.monthlyRoles.find(r => r.userId === userId && r.month === month);
  return monthRole ? monthRole.role : Role.MEMBER;
};
