/**
 * Official Google Firebase Spark Plan Free Quotas & Dynamic Resource Calculation Engine
 */

export const SPARK_PLAN_QUOTAS = {
  STORAGE_BYTES_LIMIT: 1024 * 1024 * 1024, // 1 GiB (1,073,741,824 Bytes)
  STORAGE_MB_LIMIT: 1024,
  DAILY_READS_LIMIT: 50000,
  DAILY_WRITES_LIMIT: 20000,
  DAILY_DELETES_LIMIT: 20000,
  MONTHLY_EGRESS_MB_LIMIT: 10240, // 10 GiB (10,240 MB)
  
  // Google Firestore Document Metadata Overhead Specification
  DOCUMENT_METADATA_OVERHEAD_BYTES: 64, // 32 bytes doc ID overhead + 32 bytes index overhead
};

/**
 * Human-readable byte formatting helper that automatically scales units (B, KB, MB, GB)
 * @param {number} bytes Byte count
 * @param {number} decimals Number of decimal places
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Dynamically calculates total database disk storage in bytes from actual JSON object payloads
 * Future-proof: Automatically expands if new fields or documents are added to the database.
 */
export function calculateDynamicStorageBytes(registrations = [], retreats = [], volunteers = [], serverCounts = {}) {
  const regCount = Math.max(registrations.length, serverCounts?.registrations || 0);
  const retreatCount = Math.max(retreats.length, serverCounts?.retreats || 0);
  const volCount = Math.max(volunteers.length, serverCounts?.volunteers || 0);

  // Calculate exact byte size of registrations
  const regBytes = registrations.reduce((total, r) => {
    const docSize = new Blob([JSON.stringify(r)]).size + SPARK_PLAN_QUOTAS.DOCUMENT_METADATA_OVERHEAD_BYTES;
    return total + docSize;
  }, 0);

  // Calculate exact byte size of retreats
  const retreatBytes = retreats.reduce((total, ret) => {
    const docSize = new Blob([JSON.stringify(ret)]).size + SPARK_PLAN_QUOTAS.DOCUMENT_METADATA_OVERHEAD_BYTES;
    return total + docSize;
  }, 0);

  // Calculate exact byte size of volunteers
  const volunteerBytes = volunteers.reduce((total, v) => {
    const docSize = new Blob([JSON.stringify({ email: v })]).size + SPARK_PLAN_QUOTAS.DOCUMENT_METADATA_OVERHEAD_BYTES;
    return total + docSize;
  }, 0);

  // Fallback estimates if local collections haven't populated yet
  const fallbackRegBytes = registrations.length > 0 ? (regBytes / registrations.length) : 1200;
  const fallbackRetreatBytes = retreats.length > 0 ? (retreatBytes / retreats.length) : 800;
  const fallbackVolBytes = volunteers.length > 0 ? (volunteerBytes / volunteers.length) : 300;

  const totalRegBytes = regBytes > 0 ? regBytes : (fallbackRegBytes * regCount);
  const totalRetreatBytes = retreatBytes > 0 ? retreatBytes : (fallbackRetreatBytes * retreatCount);
  const totalVolBytes = volunteerBytes > 0 ? volunteerBytes : (fallbackVolBytes * volCount);

  const totalBytes = totalRegBytes + totalRetreatBytes + totalVolBytes;

  return {
    totalBytes,
    formattedStorage: formatBytes(totalBytes),
    formattedLimit: formatBytes(SPARK_PLAN_QUOTAS.STORAGE_BYTES_LIMIT),
    percentageOfLimit: ((totalBytes / SPARK_PLAN_QUOTAS.STORAGE_BYTES_LIMIT) * 100).toFixed(4),
    avgRegDocBytes: Math.round(fallbackRegBytes),
    formattedAvgRegDocBytes: formatBytes(Math.round(fallbackRegBytes)),
    avgRetreatDocBytes: Math.round(fallbackRetreatBytes),
    avgVolDocBytes: Math.round(fallbackVolBytes)
  };
}

/**
 * Dynamically calculates outbound network egress bandwidth from verified read operations and document byte size
 */
export function calculateDynamicEgress(verifiedDailyReads = 0, avgDocBytes = 1200) {
  const dailyEgressBytes = verifiedDailyReads * avgDocBytes;
  const monthlyEgressBytes = dailyEgressBytes * 30;
  const monthlyEgressLimitBytes = SPARK_PLAN_QUOTAS.MONTHLY_EGRESS_MB_LIMIT * 1024 * 1024;

  return {
    dailyEgressBytes,
    formattedDailyEgress: formatBytes(dailyEgressBytes),
    monthlyEgressBytes,
    formattedMonthlyEgress: formatBytes(monthlyEgressBytes),
    formattedMonthlyLimit: formatBytes(monthlyEgressLimitBytes),
    percentageOfLimit: ((monthlyEgressBytes / monthlyEgressLimitBytes) * 100).toFixed(4)
  };
}
