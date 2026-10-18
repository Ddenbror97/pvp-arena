import { createServerFn } from "@tanstack/react-start";
import type { GuidePageData, GuidesHubData, TopicPageData } from "./pages";

// The guide catalog is several MB: import it only from ./pages.server so it
// never ships in the client bundle.
const slugInput = (v: unknown): string => {
  if (typeof v !== "string" || v.length > 200) throw new Error("BAD_SLUG");
  return v;
};

export const getGuidePage = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data: slug }): Promise<GuidePageData | null> => {
    const { guidePage } = await import("./pages.server");
    return guidePage(slug);
  });

export const getGuidesHub = createServerFn({ method: "GET" }).handler(
  async (): Promise<GuidesHubData> => {
    const { guidesHub } = await import("./pages.server");
    return guidesHub();
  },
);

export const getTopicPage = createServerFn({ method: "GET" })
  .inputValidator(slugInput)
  .handler(async ({ data: slug }): Promise<TopicPageData | null> => {
    const { topicPage } = await import("./pages.server");
    return topicPage(slug);
  });
