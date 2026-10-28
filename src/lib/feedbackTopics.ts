/** Shared by the feedback box (client) and src/lib/feedback.ts (server). */
export const FEEDBACK_TOPICS = [
  { id: "idea", label: "An idea" },
  { id: "content", label: "A site we got wrong" },
  { id: "bug", label: "A bug" },
  { id: "agency", label: "I work for an agency" },
] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number]["id"];
export const MAX_MESSAGE = 4000;
export const topicLabel = (id: string) => FEEDBACK_TOPICS.find((t) => t.id === id)?.label ?? "";
