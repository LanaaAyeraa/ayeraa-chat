export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  provider: "local" | "google";
  createdAt: number;
  updatedAt?: number;
}

export interface StoredUser extends User {
  passwordHash?: string; // empty for google OAuth users
  salt?: string;
}

export interface SessionTokenPayload {
  id: string;
  username: string;
  name: string;
  avatar: string;
  provider: "local" | "google";
  iat: number;
  exp: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  credentialToken?: string;
  user?: User;
  error?: string;
}
