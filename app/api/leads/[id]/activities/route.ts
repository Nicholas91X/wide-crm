import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getLeadActivities, addLeadActivity } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const activities = await getLeadActivities(params.id);
    return NextResponse.json(activities);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role !== "admin" && role !== "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Testo obbligatorio" }, { status: 400 });
    // In lib/db.ts, signature is addLeadActivity(leadId, author, content)
    await addLeadActivity(params.id, session.user?.email ?? "unknown", text.trim());
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
