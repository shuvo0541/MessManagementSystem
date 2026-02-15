
export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER'
}

export enum CalcMode {
  EQUAL = 'EQUAL',
  MULTIPLIER = 'MULTIPLIER',
  FIXED = 'FIXED'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  isAdmin: boolean;
  roomId?: string;
  rentShare?: number;
  isPermanentlyOff?: boolean;
  monthlyOff?: string[]; // Array of strings in "YYYY-MM" format
  joiningMonth?: string; // YYYY-MM
  leavingMonth?: string | null; // YYYY-MM or null
}

export interface Room {
  id: string;
  name: string;
  rent: number;
  splitType: 'EQUAL' | 'PERCENTAGE';
}

export interface MonthlyRoomOverride {
  roomId: string;
  month: string;
  rent: number;
}

export interface UtilityExpense {
  id: string;
  name: string;
  amount: number;
  defaultCalcMode: CalcMode;
}

export interface LocalUtilityExpense {
  id: string;
  month: string;
  name: string;
  amount: number;
  calcMode: CalcMode;
  calcValues: Record<string, number>;
}

export interface MonthlyUtilityOverride {
  utilityId: string;
  month: string;
  amount: number;
  calcMode: CalcMode;
  calcValues: Record<string, number>; // userId -> (multiplier or fixed amount)
}

export interface MonthlyRole {
  userId: string;
  month: string;
  role: Role;
}

export interface Meal {
  id: string;
  userId: string;
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  guest: number;
}

export interface Bazar {
  id: string;
  userId: string;
  date: string;
  amount: number;
  note: string;
}

export interface ExtraCost {
  id: string;
  month: string;
  title: string;
  amount: number;
}

export interface Payment {
  id: string;
  userId: string;
  date: string;
  amount: number;
  month: string;
}

export interface MessSystemDB {
  users: User[];
  rooms: Room[];
  monthlyRoomOverrides: MonthlyRoomOverride[];
  utilities: UtilityExpense[];
  localUtilities: LocalUtilityExpense[];
  monthlyUtilityOverrides: MonthlyUtilityOverride[];
  monthlyRoles: MonthlyRole[];
  meals: Meal[];
  bazars: Bazar[];
  extraCosts: ExtraCost[];
  payments: Payment[];
  theme: 'light' | 'dark';
  messPassword?: string;
  lockedMonths?: string[]; // Array of YYYY-MM strings
}
