import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { MarkdownContent } from "@/components/markdown/MarkdownRenderer";
import { useThemeStore } from "@/state/useThemeStore";

// Stub highlighter output with Shiki's real structure: pre.shiki > code > span.line per line
vi.mock("@/lib/shiki", () => ({
  highlightCode: vi.fn(async (code) => {
    const lines = code.split("\n");
    const spans = lines.map((line) => `<span class="line"><span>${line}</span></span>`).join("\n");
    return `<pre class="shiki"><code>${spans}</code></pre>`;
  }),
}));

const RAW_CODE = "const a = 1;\nconst b = 2;\nconsole.log(a + b);";
const MARKDOWN = "```js\n" + RAW_CODE + "\n```";

describe("MarkdownRenderer line numbers", () => {
  beforeEach(() => {
    useThemeStore.setState({ showCodeLineNumbers: false });
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("off by default - code blocks have no line-numbers class", async () => {
    const { container } = render(<MarkdownContent content={MARKDOWN} />);

    await waitFor(() => {
      expect(container.querySelector(".shiki")).not.toBeNull();
    });

    expect(container.querySelector(".line-numbers")).toBeNull();
  });

  test("toggle on - code blocks get line-numbers class", async () => {
    useThemeStore.setState({ showCodeLineNumbers: true });
    const { container } = render(<MarkdownContent content={MARKDOWN} />);

    await waitFor(() => {
      expect(container.querySelector(".shiki")).not.toBeNull();
    });

    const wrapper = container.querySelector(".line-numbers");
    expect(wrapper).not.toBeNull();
    // One span.line per source line, so CSS counters produce the numbers
    expect(wrapper.querySelectorAll(".line").length).toBe(RAW_CODE.split("\n").length);
  });

  test("toggle on before highlight lands - fallback pre still carries line-numbers", () => {
    useThemeStore.setState({ showCodeLineNumbers: true });
    const { container } = render(<MarkdownContent content={MARKDOWN} />);

    // Initial render: fallback pre (no .shiki yet)
    expect(container.querySelector(".shiki")).toBeNull();
    expect(container.querySelector("pre.line-numbers")).not.toBeNull();
  });

  test("copy copies raw code only - line numbers never leak to clipboard", async () => {
    useThemeStore.setState({ showCodeLineNumbers: true });
    render(<MarkdownContent content={MARKDOWN} />);

    await screen.findByLabelText("Copy code");
    fireEvent.click(screen.getByLabelText("Copy code"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(RAW_CODE);
    // No line-number prefixes anywhere in the copied text
    expect(navigator.clipboard.writeText.mock.calls[0][0]).not.toMatch(/(^|\n)\d+\s/);
  });
});
