import os from "node:os";
import type { NextConfig } from "next";

/**
 * Naslovi IPv4, pod katerimi je ta računalnik viden v lokalnem omrežju.
 * Preberemo jih ob zagonu, da popravek preživi menjavo IP-ja (DHCP).
 */
function localNetworkHosts(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface!.address);
}

const nextConfig: NextConfig = {
  // Next.js v razvoju blokira dostop do svojih datotek z drugega izvora kot
  // localhost. Brez tega telefon v isti wifi mreži dobi HTML brez JavaScripta —
  // stran se izriše, klik pa ne naredi ničesar.
  allowedDevOrigins: localNetworkHosts(),
};

export default nextConfig;
