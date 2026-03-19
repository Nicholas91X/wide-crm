import { NextResponse } from "next/server";
import { getAllowedUsers } from "@/lib/auth";

export async function GET() {
  const users = getAllowedUsers();
  return NextResponse.json(users);
}
