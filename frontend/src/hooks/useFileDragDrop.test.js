import { describe, test, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useFileDragDrop } from "./useFileDragDrop";

function makeDragEvent(type, { files = [], types = ["Files"] } = {}) {
  return {
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer: {
      files,
      types,
    },
  };
}

function makeFile(name, size = 1024) {
  return new File(["x".repeat(size)], name, { type: "application/octet-stream" });
}

describe("useFileDragDrop", () => {
  test("calls onFileSelect with FileList on drop", async () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const file1 = makeFile("a.txt");
    const file2 = makeFile("b.pdf");
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (i) => [file1, file2][i],
    };

    const dropEvent = makeDragEvent("drop", { files: fileList });
    await act(() => result.current.handleDrop(dropEvent));

    expect(onFileSelect).toHaveBeenCalledOnce();
    // Callback receives the full FileList
    const arg = onFileSelect.mock.calls[0][0];
    expect(arg).toBe(fileList);
  });

  test("does not call onFileSelect when no files are dropped", async () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const dropEvent = makeDragEvent("drop", { files: { length: 0 }, types: ["Files"] });
    await act(() => result.current.handleDrop(dropEvent));

    expect(onFileSelect).not.toHaveBeenCalled();
  });

  test("sets dragActive true on dragenter with Files type", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    act(() => result.current.handleDrag(makeDragEvent("dragenter")));

    expect(result.current.dragActive).toBe(true);
  });

  test("sets dragActive true on dragover with Files type", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    act(() => result.current.handleDrag(makeDragEvent("dragover")));

    expect(result.current.dragActive).toBe(true);
  });

  test("sets dragActive false on dragleave", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    act(() => result.current.handleDrag(makeDragEvent("dragenter")));
    expect(result.current.dragActive).toBe(true);

    act(() => result.current.handleDrag(makeDragEvent("dragleave")));
    expect(result.current.dragActive).toBe(false);
  });

  test("does not set dragActive for non-file drags (text selection)", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const textDragEvent = makeDragEvent("dragenter", { types: ["text/plain"] });
    act(() => result.current.handleDrag(textDragEvent));

    expect(result.current.dragActive).toBe(false);
  });

  test("does not set dragActive for link drags", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const linkDragEvent = makeDragEvent("dragenter", { types: ["text/uri-list"] });
    act(() => result.current.handleDrag(linkDragEvent));

    expect(result.current.dragActive).toBe(false);
  });

  test("sets dragActive false after drop", async () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    act(() => result.current.handleDrag(makeDragEvent("dragenter")));
    expect(result.current.dragActive).toBe(true);

    const file = makeFile("test.txt");
    const fileList = { 0: file, length: 1, item: () => file };
    await act(() => result.current.handleDrop(makeDragEvent("drop", { files: fileList })));

    expect(result.current.dragActive).toBe(false);
  });

  test("prevents default and stops propagation on drag events", () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const event = makeDragEvent("dragenter");
    act(() => result.current.handleDrag(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test("prevents default and stops propagation on drop events", async () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const file = makeFile("test.txt");
    const fileList = { 0: file, length: 1, item: () => file };
    const event = makeDragEvent("drop", { files: fileList });
    await act(() => result.current.handleDrop(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  test("handleFileInput calls onFileSelect with first file from input", async () => {
    const onFileSelect = vi.fn();
    const { result } = renderHook(() => useFileDragDrop(onFileSelect));

    const file1 = makeFile("a.txt");
    const fileList = { 0: file1, length: 1, item: () => file1 };

    await act(() => result.current.handleFileInput({ target: { files: fileList } }));

    // handleFileInput still passes files[0] for backward compat with file inputs
    expect(onFileSelect).toHaveBeenCalledOnce();
  });
});
