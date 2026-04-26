import type { Topic } from "@/types/plan";

export const TOPICS_PER_UNIT = 5;

export function groupTopicsIntoUnits(topics: Topic[]) {
  const units: { title: string; topics: Topic[]; startIndex: number }[] = [];
  for (let i = 0; i < topics.length; i += TOPICS_PER_UNIT) {
    const chunk = topics.slice(i, i + TOPICS_PER_UNIT);
    const unitNumber = units.length + 1;
    units.push({
      title: `Unit ${unitNumber}`,
      topics: chunk,
      startIndex: i,
    });
  }
  return units;
}
