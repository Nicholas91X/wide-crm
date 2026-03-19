import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getClients } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
