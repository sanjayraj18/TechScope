import categories from "@techscope/detector/data/categories.json";

const byId = categories as Record<string, { name: string }>;

export const categoryName = (id: number) =>
  byId[String(id)]?.name ?? `Category ${id}`;
