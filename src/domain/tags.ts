import { TAGS, type Tag } from "./schemas";

/**
 * The fixed tag vocabulary, borrowed from GitHub's default labels so it matches
 * what you already use. Colours are referenced as CSS custom properties (defined
 * in styles/tokens.css) so the design layer and the logic layer never disagree
 * about what "bug" looks like.
 */
export interface TagMeta {
  readonly tag: Tag;
  readonly label: string;
  /** GitHub's meaning for the label, shown as a tooltip / a11y description. */
  readonly meaning: string;
  readonly fgVar: string;
  readonly bgVar: string;
}

export const TAG_META: Record<Tag, TagMeta> = {
  bug: {
    tag: "bug",
    label: "bug",
    meaning: "Unexpected problem or unintended behaviour",
    fgVar: "var(--tag-bug-fg)",
    bgVar: "var(--tag-bug-bg)",
  },
  enhancement: {
    tag: "enhancement",
    label: "enhancement",
    meaning: "New feature or improvement",
    fgVar: "var(--tag-enhancement-fg)",
    bgVar: "var(--tag-enhancement-bg)",
  },
  documentation: {
    tag: "documentation",
    label: "documentation",
    meaning: "Docs need writing or fixing",
    fgVar: "var(--tag-documentation-fg)",
    bgVar: "var(--tag-documentation-bg)",
  },
  question: {
    tag: "question",
    label: "question",
    meaning: "Needs more thought or investigation before it's actionable",
    fgVar: "var(--tag-question-fg)",
    bgVar: "var(--tag-question-bg)",
  },
};

export const TAG_LIST: readonly TagMeta[] = TAGS.map((t) => TAG_META[t]);

/**
 * A tag *filter* value. `"all"` is no filter; `"untagged"` is a first-class
 * bucket that always appears as an option so ideas captured in a hurry stay
 * reachable (spec: the Untagged bucket appears in every tag filter).
 */
export type TagFilter = Tag | "all" | "untagged";

export const isTag = (v: string): v is Tag => (TAGS as readonly string[]).includes(v);

/**
 * Curated category accent colours. A free colour picker produces unreadable
 * panels on the near-black board, so categories choose from this set. Rendered
 * only as an edge rule / a dot — never a filled pill — so tag and category
 * colour can never be confused.
 */
export interface CategoryColour {
  readonly id: string;
  readonly label: string;
  readonly hex: string;
}

export const CATEGORY_COLOURS: readonly CategoryColour[] = [
  { id: "slate", label: "Slate", hex: "#7c8ca1" },
  { id: "moss", label: "Moss", hex: "#6fae82" },
  { id: "clay", label: "Clay", hex: "#c98a6b" },
  { id: "iris", label: "Iris", hex: "#8e8ad9" },
  { id: "rust", label: "Rust", hex: "#c2705a" },
  { id: "fern", label: "Fern", hex: "#86a96a" },
  { id: "plum", label: "Plum", hex: "#a87ba8" },
  { id: "steel", label: "Steel", hex: "#6e9bb0" },
];

export const DEFAULT_CATEGORY_COLOUR = CATEGORY_COLOURS[0]?.hex ?? "#7c8ca1";

const CATEGORY_COLOUR_HEXES: ReadonlySet<string> = new Set(
  CATEGORY_COLOURS.map((c) => c.hex),
);

export const isCategoryColour = (hex: string): boolean =>
  CATEGORY_COLOUR_HEXES.has(hex.toLowerCase());
