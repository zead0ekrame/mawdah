import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function GET(request: Request) {
  await clearSession();
  
  // Get the base URL from the incoming request so it redirects correctly regardless of port
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  return NextResponse.redirect(new URL("/", baseUrl));
}
