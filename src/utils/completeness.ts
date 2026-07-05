import type { Fragment, GraphData } from "@/services/cognee";

export type CompletenessResult = {
  percent: number;
  label: string;
  gaps: string[];
};

type Category = "photo" | "voice" | "location" | "text";

function categorize(fragment: Fragment): Category {
  if (fragment.name.startsWith("photo_")) return "photo";
  if (fragment.preview.includes("[voice]")) return "voice";
  if (fragment.preview.includes("Location captured:")) return "location";
  return "text";
}

function labelFor(percent: number): string {
  if (percent <= 30) return "Hazy night";
  if (percent <= 60) return "Coming into focus";
  if (percent <= 85) return "Mostly clear";
  return "Fully reconstructed";
}

function hasPersonEntity(graph: GraphData): boolean {
  return graph.nodes.some(node => {
    if (node.type !== "Entity") return false;
    const entityType = node.properties?.type;
    return typeof entityType === "string" && entityType.toLowerCase() === "person";
  });
}

export function calculateCompleteness(
  fragments: Fragment[],
  graph: GraphData,
): CompletenessResult {
  const categories = new Set(fragments.map(categorize));
  const hasPhoto = categories.has("photo");
  const hasVoice = categories.has("voice");
  const hasLocation = categories.has("location");
  const hasText = categories.has("text");
  const identifiedPerson = hasPersonEntity(graph);

  let score = 0;

  // Variety bonus — 15 points per category present, up to 60.
  score += [hasPhoto, hasVoice, hasLocation, hasText].filter(Boolean).length * 15;

  // +10 for every 2 fragments beyond the first 4, capped at 30.
  score += Math.min(30, Math.floor(Math.max(0, fragments.length - 4) / 2) * 10);

  // +10 if someone has been identified in the graph.
  if (identifiedPerson) score += 10;

  const percent = Math.min(100, score);

  const gaps: string[] = [];
  if (percent < 86) {
    if (!hasPhoto) gaps.push("No photos captured today");
    if (!identifiedPerson) gaps.push("No one identified yet");
    if (!hasLocation) gaps.push("Try adding a location");
  }

  return {
    percent,
    label: labelFor(percent),
    gaps: gaps.slice(0, 2),
  };
}
