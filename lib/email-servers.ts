import fs from "fs";
import path from "path";
import { isSupabaseConfigured, getSupabaseAdmin } from "./supabase";
import { EmailServer } from "@/types/ticket";
import nodemailer from "nodemailer";

const DATA_DIR = path.join(process.cwd(), "data");
const SERVERS_FILE = path.join(DATA_DIR, "email_servers.json");

let inMemoryServers: EmailServer[] | null = null;
let lastServerIndex = 0;

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVERS_FILE)) {
      fs.writeFileSync(SERVERS_FILE, JSON.stringify([], null, 2), "utf8");
    }
  } catch {}
}

function readServersFromDisk(): EmailServer[] {
  ensureDataFile();
  try {
    if (fs.existsSync(SERVERS_FILE)) {
      const raw = fs.readFileSync(SERVERS_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function writeServersToDisk(servers: EmailServer[]) {
  try {
    ensureDataFile();
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(servers, null, 2), "utf8");
  } catch {}
}

/**
 * Checks and resets today_sent counter if calendar day changed
 */
function checkDayRollover(server: EmailServer): EmailServer {
  if (!server.lastSentAt) return server;
  const lastDate = new Date(server.lastSentAt).toISOString().slice(0, 10);
  const todayDate = new Date().toISOString().slice(0, 10);
  if (lastDate !== todayDate) {
    return {
      ...server,
      todaySent: 0,
      status: server.status === "limit_reached" ? "active" : server.status,
    };
  }
  return server;
}

/**
 * Retrieves all configured email servers from Supabase PostgreSQL (with disk fallback)
 */
export async function getAllEmailServers(): Promise<EmailServer[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const { data, error } = await supabase
        .from("email_servers")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        const todayDate = new Date().toISOString().slice(0, 10);
        const mapped: EmailServer[] = data.map((d: any) => {
          let s: EmailServer = {
            id: d.id,
            name: d.name,
            email: d.email,
            host: d.host || "smtp.gmail.com",
            port: d.port || 465,
            secure: d.secure !== false,
            username: d.username,
            password: d.password,
            dailyLimit: d.daily_limit ?? 450,
            totalSent: d.total_sent ?? 0,
            todaySent: d.today_sent ?? 0,
            lastSentAt: d.last_sent_at,
            status: d.status || "active",
            lastError: d.last_error,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          };
          // Reset daily count if day changed
          s = checkDayRollover(s);
          return s;
        });
        inMemoryServers = mapped;
        return mapped;
      }
    } catch (err) {
      console.error("Failed to query email_servers from Supabase:", err);
    }
  }

  // Fallback to disk / memory
  const disk = readServersFromDisk();
  return disk.map(checkDayRollover);
}

/**
 * Adds or updates an email server in the pool
 */
export async function saveEmailServer(server: Partial<EmailServer> & { email: string; password?: string }): Promise<EmailServer> {
  const id = server.id || `srv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString();

  const newServer: EmailServer = {
    id,
    name: server.name || server.email,
    email: server.email.trim().toLowerCase(),
    host: server.host || "smtp.gmail.com",
    port: Number(server.port) || 465,
    secure: server.secure !== false,
    username: (server.username || server.email).trim().toLowerCase(),
    password: server.password ? server.password.trim() : "",
    dailyLimit: Number(server.dailyLimit) || 450,
    totalSent: server.totalSent || 0,
    todaySent: server.todaySent || 0,
    lastSentAt: server.lastSentAt,
    status: server.status || "active",
    lastError: server.lastError,
    createdAt: server.createdAt || now,
    updatedAt: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const sbRow: any = {
        id: newServer.id,
        name: newServer.name,
        email: newServer.email,
        host: newServer.host,
        port: newServer.port,
        secure: newServer.secure,
        username: newServer.username,
        daily_limit: newServer.dailyLimit,
        total_sent: newServer.totalSent,
        today_sent: newServer.todaySent,
        status: newServer.status,
        last_error: newServer.lastError,
        updated_at: now,
      };
      if (newServer.password) {
        sbRow.password = newServer.password;
      }
      await supabase.from("email_servers").upsert(sbRow);
    } catch (err) {
      console.error("Failed to upsert email_server into Supabase:", err);
    }
  }

  // Disk fallback
  const servers = readServersFromDisk();
  const idx = servers.findIndex((s) => s.id === id);
  if (idx !== -1) {
    servers[idx] = { ...servers[idx], ...newServer };
  } else {
    servers.push(newServer);
  }
  writeServersToDisk(servers);
  inMemoryServers = servers;

  return newServer;
}

/**
 * Removes an email server from the pool
 */
export async function deleteEmailServer(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      await supabase.from("email_servers").delete().eq("id", id);
    } catch {}
  }

  const servers = readServersFromDisk();
  const filtered = servers.filter((s) => s.id !== id);
  writeServersToDisk(filtered);
  inMemoryServers = filtered;
  return true;
}

/**
 * Selects the next available active email server using Round-Robin load balancing
 */
export async function getNextAvailableEmailServer(): Promise<EmailServer | null> {
  const all = await getAllEmailServers();
  const active = all.filter(
    (s) => s.status === "active" && s.todaySent < s.dailyLimit && Boolean(s.password)
  );

  if (active.length === 0) return null;

  // Round-robin selection
  lastServerIndex = (lastServerIndex + 1) % active.length;
  return active[lastServerIndex];
}

/**
 * Increments sent counter for a specific server after successful delivery
 */
export async function recordServerSuccess(serverId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      const { data } = await supabase
        .from("email_servers")
        .select("total_sent, today_sent, daily_limit")
        .eq("id", serverId)
        .single();

      if (data) {
        const newToday = (data.today_sent || 0) + 1;
        const newTotal = (data.total_sent || 0) + 1;
        const isLimitReached = newToday >= (data.daily_limit || 450);

        await supabase
          .from("email_servers")
          .update({
            total_sent: newTotal,
            today_sent: newToday,
            last_sent_at: now,
            status: isLimitReached ? "limit_reached" : "active",
            last_error: null,
            updated_at: now,
          })
          .eq("id", serverId);
      }
    } catch {}
  }
}

/**
 * Records an error or marks server limit_reached if daily quota hit
 */
export async function recordServerFailure(serverId: string, errorMsg: string): Promise<void> {
  const now = new Date().toISOString();
  const isLimit =
    errorMsg.includes("550") ||
    errorMsg.toLowerCase().includes("daily") ||
    errorMsg.toLowerCase().includes("limit") ||
    errorMsg.toLowerCase().includes("exceeded");

  const newStatus = isLimit ? "limit_reached" : "error";

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin()!;
      await supabase
        .from("email_servers")
        .update({
          status: newStatus,
          last_error: errorMsg,
          updated_at: now,
        })
        .eq("id", serverId);
    } catch {}
  }
}

/**
 * Tests connection for a specific email server
 */
export async function testSingleServerConnection(
  server: EmailServer,
  recipient: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: server.host,
      port: server.port,
      secure: server.secure !== false,
      auth: {
        user: server.username,
        pass: server.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${server.name}" <${server.email}>`,
      to: recipient,
      replyTo: server.email,
      subject: `✓ اختبار خادم البريد: ${server.name} [${server.email}]`,
      text: `مرحباً، تم اختبار خادم البريد (${server.name} - ${server.email}) بنجاح وهو متصل وجاهز لتوزيع الإرسال.`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; padding: 20px; background: #f9f9fb; border-radius: 12px;">
          <h2 style="color: #6c12e8; margin-bottom: 8px;">✓ اختبار خادم البريد ناجح!</h2>
          <p style="color: #333; font-size: 14px;">تم الاتصال بنجاح بخادم البريد: <strong>${server.name}</strong> (${server.email}).</p>
          <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e5e7; margin-top: 12px; font-size: 13px;">
            <div><strong>Host:</strong> ${server.host}:${server.port}</div>
            <div><strong>الحالة:</strong> جاهز للإرسال والتوزيع التلقائي</div>
          </div>
        </div>
      `,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
