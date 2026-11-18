import { describe, expect, it } from "vitest";
import { discussionForumPostingJsonLd, qaPageJsonLd } from "./jsonld";

const author = { name: "sam", url: "https://example.com/u/sam" };

describe("forum JSON-LD (SPEC §5/§13)", () => {
  it("builds a QAPage with the accepted and suggested answers", () => {
    const data = qaPageJsonLd({
      title: "How do I lose the cops?",
      text: "Question body",
      url: "https://example.com/forum/t/1/x",
      dateCreated: "2026-11-19T00:00:00Z",
      upvoteCount: 3,
      answerCount: 2,
      author,
      accepted: {
        text: "Hide",
        url: "https://example.com/forum/t/1/x#post-2",
        dateCreated: "2026-11-19T01:00:00Z",
        upvoteCount: 5,
        author: { name: "[deleted user]" },
      },
      suggested: [
        {
          text: "Run",
          url: "https://example.com/forum/t/1/x#post-3",
          dateCreated: "2026-11-19T02:00:00Z",
          upvoteCount: 0,
          author,
        },
      ],
    });
    expect(data["@type"]).toBe("QAPage");
    expect(data.mainEntity).toMatchObject({
      "@type": "Question",
      name: "How do I lose the cops?",
      answerCount: 2,
      author: { "@type": "Person", name: "sam", url: author.url },
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hide",
        upvoteCount: 5,
        author: { "@type": "Person", name: "[deleted user]" },
      },
    });
    expect(data.mainEntity.acceptedAnswer.author).not.toHaveProperty("url");
    expect(data.mainEntity.suggestedAnswer).toHaveLength(1);
  });

  it("builds a DiscussionForumPosting with comments and counters", () => {
    const data = discussionForumPostingJsonLd({
      title: "Best car so far?",
      text: "Body",
      url: "https://example.com/forum/t/2/y",
      datePublished: "2026-11-19T00:00:00Z",
      author,
      commentCount: 0,
      upvoteCount: 1,
      comments: [],
    });
    expect(data).toMatchObject({ "@type": "DiscussionForumPosting", headline: "Best car so far?", text: "Body" });
    expect(data).not.toHaveProperty("comment");
    expect(data).not.toHaveProperty("dateModified");
    expect(data.interactionStatistic[0]).toMatchObject({ userInteractionCount: 0 });
  });
});
