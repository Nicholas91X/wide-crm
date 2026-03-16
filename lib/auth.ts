export type Role = "admin" | "editor" | "viewer";

export interface AllowedUser {
  email: string;
  role: Role;
}

export function getAllowedUsers(): AllowedUser[] {
  try {
    return JSON.parse(process.env.ALLOWED_USERS || "[]");
  } catch {
    return [];
  }
}

export function getRoleFromEmail(email: string): Role | null {
  const users = getAllowedUsers();
  const user = users.find((u) => u.email === email);
  return user ? user.role : null;
}

export function isAllowed(email: string): boolean {
  return getRoleFromEmail(email) !== null;
}
