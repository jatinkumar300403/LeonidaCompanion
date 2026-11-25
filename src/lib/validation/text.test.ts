import { describe, expect, it } from "vitest";
import { cleanLine, cleanLineString, cleanText } from "./text";

describe("cleanText / cleanLine (D-101)", () => {
  it("removes bidi overrides and isolates", () => {
    expect(cleanText("\u202Egnp.exe")).toBe("gnp.exe");
    expect(cleanText("a\u202Ab\u202Bc\u202Cd\u202De")).toBe("abcde");
    expect(cleanText("\u2066x\u2067y\u2068z\u2069")).toBe("xyz");
  });

  it("removes zero-width and other invisible characters", () => {
    expect(cleanText("ad\u200Bmin")).toBe("admin");
    expect(cleanText("\uFEFFhello\u2060")).toBe("hello");
    expect(cleanText("soft\u00ADhyphen")).toBe("softhyphen");
    expect(cleanText("bell\u0007 nul\u0000")).toBe("bell nul");
    expect(cleanText("tag\uDB40\uDC41\uDB40\uDC42")).toBe("tag");
  });

  it("keeps what real text needs", () => {
    expect(cleanText("👩\u200D💻 family")).toBe("👩\u200D💻 family"); // ZWJ emoji
    expect(cleanText("می\u200Cخواهم")).toBe("می\u200Cخواهم"); // Persian ZWNJ
    expect(cleanText("مرحبا שלום Привет 你好")).toBe("مرحبا שלום Привет 你好");
    expect(cleanText("line one\nline two\ttab")).toBe("line one\nline two\ttab");
    expect(cleanText("a\u200Eb\u200Fc")).toBe("a\u200Eb\u200Fc");
  });

  it("cleanLine folds line breaks and tabs into one space", () => {
    expect(cleanLine("Title\r\nwith\tbreaks\n\n")).toBe("Title with breaks ");
  });

  it("a title made only of invisible characters fails the minimum length", () => {
    const schema = cleanLineString().trim().min(3);
    expect(schema.safeParse("\u200B\u200B\u200B\u202E\u202E").success).toBe(false);
    expect(schema.safeParse(" \u202Eabc ").data).toBe("abc");
  });
});
