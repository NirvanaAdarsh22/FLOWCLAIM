
import nodemailer from "nodemailer";
import dns from "node:dns";
import { dnsCache } from "nodemailer/lib/shared";
import env from "./env.js";

// Ensure Node's c-ares DNS resolver has public fallback servers (helps in WARP/VPN environments)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Ignore if permissions are restricted
}

// Fallback Google SMTP IPv4 addresses
const GOOGLE_SMTP_IPS = [
  "142.251.179.108",
  "142.251.179.109",
  "108.177.127.108",
  "108.177.127.109",
  "74.125.137.108",
  "74.125.137.109"
];

// Pre-seed Nodemailer's internal dnsCache so resolveHostname never times out
dnsCache.set("smtp.gmail.com", {
  value: { addresses: GOOGLE_SMTP_IPS },
  expires: Date.now() + 24 * 60 * 60 * 1000
});

// Continuously update dnsCache using OS-level resolution (getaddrinfo via dns.lookup)
const refreshDnsCache = () => {
  dns.lookup("smtp.gmail.com", { all: true }, (err, addresses) => {
    if (!err && Array.isArray(addresses) && addresses.length > 0) {
      const resolvedIps = addresses.map((a) => a.address).filter(Boolean);
      if (resolvedIps.length > 0) {
        dnsCache.set("smtp.gmail.com", {
          value: { addresses: resolvedIps },
          expires: Date.now() + 24 * 60 * 60 * 1000
        });
      }
    }
  });
};

refreshDnsCache();
const timer = setInterval(refreshDnsCache, 10 * 60 * 1000);
if (timer.unref) timer.unref();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_USER.trim(),
    pass: env.EMAIL_PASS.replace(/\s/g, "")
  }
});

export default transporter;

