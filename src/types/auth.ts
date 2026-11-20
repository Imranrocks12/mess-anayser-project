export type UserRole = 'admin' | 'manager' | 'member';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
  loginAt: string;
}

