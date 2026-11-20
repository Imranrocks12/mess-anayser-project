import type { AppUser } from '../types/auth';
import { uploadUsersToCloud, downloadUsersFromCloud } from './firebase';
import { dataService } from './dataService';

const STORAGE_KEYS = {
  USERS: 'messmate_users_v1',
  CURRENT_USER: 'messmate_current_user_v1',
};

const DEFAULT_USERS: AppUser[] = [
  {
    id: 'user_admin_1',
    name: 'Imran (Admin)',
    username: 'admin',
    email: 'admin@messmate.local',
    password: 'admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_demo_1',
    name: 'Demo Admin',
    username: 'demo',
    email: 'demo@messmate.local',
    password: 'demo',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
];

type AuthListener = (user: AppUser | null) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: AppUser | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Initialize default users if none present
    const storedUsers = this.getUsers();
    if (storedUsers.length === 0) {
      this.saveUsers(DEFAULT_USERS);
    }

    // Restore active session
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    } catch {
      this.currentUser = null;
    }

    // Asynchronously fetch accounts from Firebase Firestore on startup
    this.syncUsersFromCloud().catch(() => {});
  }

  public getUsers(): AppUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: AppUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }

  public async syncUsersFromCloud(): Promise<AppUser[]> {
    try {
      const res = await downloadUsersFromCloud();
      if (res.success && Array.isArray(res.users) && res.users.length > 0) {
        const localUsers = this.getUsers();
        const userMap = new Map<string, AppUser>();

        // Merge defaults, local, and cloud users
        DEFAULT_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
        localUsers.forEach((u) => userMap.set(u.username.toLowerCase(), u));
        res.users.forEach((u: AppUser) => userMap.set(u.username.toLowerCase(), u));

        const merged = Array.from(userMap.values());
        this.saveUsers(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Could not sync users from cloud:', e);
    }
    return this.getUsers();
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  public async login(
    identifier: string,
    passwordAttempt: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    if (!cleanId) {
      return { success: false, error: 'Please enter a username or email' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Please enter your password' };
    }

    // Step 1: Check in local cached accounts
    let users = this.getUsers();
    let user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        (u.email && u.email.toLowerCase() === cleanId)
    );

    // Step 2: If not found locally, fetch latest accounts from Firebase Firestore (Crucial for new devices!)
    if (!user) {
      const cloudUsers = await this.syncUsersFromCloud();
      user = cloudUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanId ||
          (u.email && u.email.toLowerCase() === cleanId)
      );
    }

    if (!user) {
      return { success: false, error: 'User account not found. Please check username or create a new user.' };
    }

    // Verify password (allowing admin123 alias for admin/demo user as well for user convenience)
    const isPasswordValid =
      user.password === cleanPass ||
      (user.username.toLowerCase() === 'admin' && (cleanPass === 'admin' || cleanPass === 'admin123')) ||
      (user.username.toLowerCase() === 'demo' && (cleanPass === 'demo' || cleanPass === 'demo123'));

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    this.currentUser = user;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } catch {
      // ignore
    }
    this.notify();
    return { success: true, user };
  }

  public loginDemo(): { success: boolean; user: AppUser } {
    const users = this.getUsers();
    let demoUser = users.find((u) => u.username.toLowerCase() === 'admin');
    if (!demoUser) {
      demoUser = DEFAULT_USERS[0];
      this.saveUsers([...users, demoUser]);
    }

    this.currentUser = demoUser;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUser));
    } catch {
      // ignore
    }
    this.notify();
    return { success: true, user: demoUser };
  }

  public async createUser(userData: {
    name: string;
    username: string;
    email?: string;
    password: string;
    role?: 'admin' | 'manager' | 'member';
  }): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    const name = userData.name.trim();
    const username = userData.username.trim().toLowerCase();
    const email = userData.email?.trim().toLowerCase() || '';
    const password = userData.password.trim();
    const role = userData.role || 'admin';

    if (!name) {
      return { success: false, error: 'Full name is required' };
    }
    if (!username) {
      return { success: false, error: 'Username is required' };
    }
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!password) {
      return { success: false, error: 'Password is required' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }

    // Sync cloud users first to ensure username is unique across all devices
    const users = await this.syncUsersFromCloud();
    const usernameExists = users.some((u) => u.username.toLowerCase() === username);
    if (usernameExists) {
      return { success: false, error: `Username "${username}" is already taken` };
    }

    if (email) {
      const emailExists = users.some((u) => u.email && u.email.toLowerCase() === email);
      if (emailExists) {
        return { success: false, error: `Email "${email}" is already registered` };
      }
    }

    const newUser: AppUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      username,
      email: email || undefined,
      password,
      role,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    this.saveUsers(updatedUsers);

    // Save directly to Firebase Firestore cloud database so any device can log in!
    try {
      await uploadUsersToCloud(updatedUsers);
    } catch (e) {
      console.warn('Could not sync newly created user to Firestore cloud:', e);
    }

    // Auto-login newly registered user
    this.currentUser = newUser;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    } catch {
      // ignore
    }

    // Immediately reset mess data & bill records to fresh state for the new user
    try {
      dataService.clearDataForNewUser(newUser.name);
    } catch (e) {
      console.warn('Could not reset data for new user:', e);
    }

    this.notify();

    return { success: true, user: newUser };
  }

  public logout(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {
      // ignore
    }
    this.notify();
  }
}

export const authService = new AuthService();
