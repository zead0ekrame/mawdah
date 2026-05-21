import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  const networkInterfaces = os.networkInterfaces();
  let localIp = "localhost";
  
  let found = false;
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName] || [];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIp = iface.address;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  return NextResponse.json({ localIp });
}
