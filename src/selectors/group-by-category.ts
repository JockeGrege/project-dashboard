import {
  UNCATEGORISED_KEY,
  type Category,
  type CategoryGroup,
  type Project,
} from "@/domain";

const UNCATEGORISED_COLOUR = "#6b7482"; // --ink-500; a non-accent, so it reads as "no category"

/**
 * Group projects into the dashboard's category view. Real categories appear in
 * `sortOrder`; a synthesised "Uncategorised" group is appended last and only
 * when it has projects. Projects whose `categoryId` points at a missing category
 * also fall into Uncategorised.
 *
 * Empty real categories are kept by default so every category you've made stays
 * visible (delete unused ones from settings); pass `includeEmpty: false` to drop
 * them.
 */
export function groupByCategory(
  projects: readonly Project[],
  categories: readonly Category[],
  options: { includeEmpty?: boolean } = {},
): CategoryGroup[] {
  const includeEmpty = options.includeEmpty ?? true;

  const known = new Set(categories.map((c) => c.id));
  const buckets = new Map<string, Project[]>();
  for (const project of projects) {
    const key =
      project.categoryId && known.has(project.categoryId)
        ? project.categoryId
        : UNCATEGORISED_KEY;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(project);
    else buckets.set(key, [project]);
  }

  const groups: CategoryGroup[] = [];

  for (const category of [...categories].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const members = buckets.get(category.id) ?? [];
    if (members.length === 0 && !includeEmpty) continue;
    groups.push({
      category,
      key: category.id,
      label: category.name,
      colour: category.colour,
      projects: members,
    });
  }

  const orphans = buckets.get(UNCATEGORISED_KEY) ?? [];
  if (orphans.length > 0) {
    groups.push({
      category: null,
      key: UNCATEGORISED_KEY,
      label: "Uncategorised",
      colour: UNCATEGORISED_COLOUR,
      projects: orphans,
    });
  }

  return groups;
}
