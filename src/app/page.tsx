import { getQuota, type Quota } from "@/lib/openrouter";
import { AutoRefresh } from "./auto-refresh";

// Always render on request: the numbers change with every API call.
export const dynamic = "force-dynamic";

const usd = (n: number | null, digits = 2) =>
  n === null
    ? "—"
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const RESET_LABEL: Record<string, string> = {
  daily: "รายวัน",
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
};

function status(q: Quota): {
  tone: "ok" | "low" | "out" | "none";
  text: string;
} {
  if (q.limit === null) return { tone: "none", text: "ไม่มีเพดาน" };
  const remaining = q.limitRemaining ?? q.limit - q.usage;
  if (remaining <= 0) return { tone: "out", text: "เพดานเต็มแล้ว" };
  if (remaining / q.limit < 0.2) return { tone: "low", text: "เหลือน้อย" };
  return { tone: "ok", text: "ปกติ" };
}

const REASON: Record<string, string> = {
  "not-configured":
    "ยังไม่ได้ตั้ง OPENROUTER_API_KEY ฝั่งเซิร์ฟเวอร์ (ดู .env.example)",
  unauthorized: "OpenRouter ปฏิเสธ key นี้ (หมดอายุหรือถูกเพิกถอน)",
  upstream: "OpenRouter ตอบกลับผิดปกติ ลองใหม่อีกครั้ง",
  network: "เชื่อมต่อ OpenRouter ไม่ได้ ลองใหม่อีกครั้ง",
};

export default async function Page() {
  const result = await getQuota();
  const when = new Date(result.fetchedAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
  });

  return (
    <main>
      <header>
        <div>
          <h1>LMWN OpenRouter quota</h1>
          <p className="muted">อัปเดตล่าสุด {when} (เวลาไทย)</p>
        </div>
        <AutoRefresh />
      </header>

      {!result.ok ? (
        <section className="card error" role="alert">
          <h2>ดึงข้อมูลไม่ได้</h2>
          <p>{REASON[result.reason]}</p>
        </section>
      ) : (
        <Quota quota={result.quota} />
      )}
    </main>
  );
}

function Quota({ quota: q }: { quota: Quota }) {
  const s = status(q);
  // Spend counted against the limit follows the reset window.
  const windowUsage =
    q.limitReset === "daily"
      ? q.usageDaily
      : q.limitReset === "monthly"
        ? q.usageMonthly
        : q.usageWeekly;
  const windowPct =
    q.limit && q.limit > 0 ? Math.min(100, (windowUsage / q.limit) * 100) : 0;

  return (
    <>
      <section className="card hero">
        <div className="hero-top">
          <div>
            <p className="label">คงเหลือในรอบนี้</p>
            <p className="big">{usd(q.limitRemaining)}</p>
          </div>
          <span className={`chip ${s.tone}`}>{s.text}</span>
        </div>
        {q.limit !== null && (
          <>
            <div
              className={`bar ${s.tone}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(windowPct)}
              aria-label="สัดส่วนที่ใช้ไปของเพดาน"
            >
              <div style={{ width: `${windowPct}%` }} />
            </div>
            <p className="muted">
              ใช้ไป {usd(windowUsage)} จากเพดาน {usd(q.limit)}
              {q.limitReset &&
                ` · รีเซ็ต${RESET_LABEL[q.limitReset] ?? q.limitReset}`}
            </p>
          </>
        )}
      </section>

      <section className="grid" aria-label="ยอดใช้งานแยกช่วงเวลา">
        <Stat label="วันนี้" value={usd(q.usageDaily)} />
        <Stat label="สัปดาห์นี้" value={usd(q.usageWeekly)} />
        <Stat label="เดือนนี้" value={usd(q.usageMonthly)} />
        <Stat label="รวมตลอดอายุ key" value={usd(q.usage)} />
      </section>

      <section className="card">
        <h2>รายละเอียด</h2>
        <dl>
          <dt>เพดาน</dt>
          <dd>{usd(q.limit)}</dd>
          <dt>ประเภทการรีเซ็ต</dt>
          <dd>
            {q.limitReset
              ? (RESET_LABEL[q.limitReset] ?? q.limitReset)
              : "ไม่รีเซ็ต"}
          </dd>
          <dt>ใช้ผ่าน BYOK</dt>
          <dd>{usd(q.byokUsage)}</dd>
          <dt>Free tier</dt>
          <dd>{q.isFreeTier ? "ใช่" : "ไม่ใช่"}</dd>
          <dt>Free model วันนี้</dt>
          <dd>
            {q.freeModelRequests
              ? `${q.freeModelRequests.used} / ${q.freeModelRequests.limit} (เหลือ ${q.freeModelRequests.remaining})`
              : "—"}
          </dd>
          <dt>หมดอายุ</dt>
          <dd>{q.expiresAt ?? "ไม่มี"}</dd>
        </dl>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card stat">
      <p className="label">{label}</p>
      <p className="num">{value}</p>
    </div>
  );
}
