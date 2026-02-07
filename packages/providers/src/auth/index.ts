/**
 * Auth provider abstractions
 *
 * This module defines interfaces for authentication providers,
 * allowing ForPrompt to support multiple auth backends (Clerk, NextAuth, etc.)
 */

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface Session {
  userId: string;
  expiresAt: Date;
}

export interface AuthProvider {
  /**
   * Get the current user from the request context
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Get the current session
   */
  getSession(): Promise<Session | null>;

  /**
   * Verify an API key and return the associated user/org context
   */
  verifyApiKey(apiKey: string): Promise<{ userId: string; organizationId: string } | null>;
}

export type AuthProviderFactory = () => AuthProvider;
