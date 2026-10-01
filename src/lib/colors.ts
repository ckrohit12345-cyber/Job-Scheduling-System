export interface ProcessColor {
  bg: string; // solid fill
  fg: string; // text colour with >= 4.5:1 contrast on bg
  border: string;
  name: string;
}

// Six hues from the vibrant, high-energy modern developer specification
// High-saturation, crisp, distinct fills with contrasting dark typography inside:
// P1: Vibrant Electric Indigo (#818CF8)
// P2: Bright Mint Emerald (#34D399)
// P3: Warm Amber Gold (#FBBF24)
// P4: Bright Coral Rose (#FB7185)
// P5: Vivid Sky Blue (#38BDF8)
// P6: Electric Orchid / Purple (#C084FC)
export const PROCESS_COLORS: ProcessColor[] = [
  { name: "indigo", bg: "#818CF8", fg: "#09090B", border: "#6366F1" }, // P1
  { name: "emerald", bg: "#34D399", fg: "#09090B", border: "#10B981" }, // P2
  { name: "amber", bg: "#FBBF24", fg: "#09090B", border: "#F59E0B" }, // P3
  { name: "rose", bg: "#FB7185", fg: "#09090B", border: "#F43F5E" }, // P4
  { name: "sky", bg: "#38BDF8", fg: "#09090B", border: "#0EA5E9" }, // P5
  { name: "purple", bg: "#C084FC", fg: "#09090B", border: "#A855F7" }, // P6
];

export const IDLE_COLOR: ProcessColor = {
  name: "idle",
  bg: "#27272A",
  fg: "#A1A1AA",
  border: "#3F3F46"
};

export const SWITCH_COLOR: ProcessColor = {
  name: "switch",
  bg: "#FF2E93",
  fg: "#FFFFFF",
  border: "#E11D48"
};

/**
 * Returns a stable, deterministic process color based on numeric or string Job ID
 */
export function getJobColor(jobId: string | number | null): ProcessColor {
  if (jobId === null || jobId === -1 || jobId === "-1") {
    return IDLE_COLOR;
  }
  if (jobId === -2 || jobId === "-2") {
    return SWITCH_COLOR;
  }
  const cleanId = String(jobId).replace(/\D/g, "");
  const num = cleanId ? parseInt(cleanId, 10) : String(jobId).charCodeAt(0);
  const index = Math.abs(num - 1) % PROCESS_COLORS.length;
  return PROCESS_COLORS[index];
}
