import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PracticeView } from "../PracticeView";

describe("PracticeView", () => {
  const baseProps = {
    isPlaying: false,
    isAnalyzing: false,
    moodInput: "",
    explainLine: null as string | null,
    dynamicPrompt: null as { question: string; options: string[] } | null,
    showFeedbackPrompt: false,
    onMoodInputChange: vi.fn(),
    onMoodSubmit: vi.fn(),
    onQuickMood: vi.fn(),
    onFeedbackOption: vi.fn(),
  };

  it("calls onQuickMood with the configured phrase for a quick mood chip", async () => {
    const user = userEvent.setup();
    const onQuickMood = vi.fn();

    render(<PracticeView {...baseProps} onQuickMood={onQuickMood} />);

    await user.click(screen.getByRole("button", { name: "Calm" }));
    expect(onQuickMood).toHaveBeenCalledWith(
      "I'm feeling calm and want to stay grounded and soft.",
    );
  });

  it("disables submit when input is empty", () => {
    render(<PracticeView {...baseProps} moodInput="" />);

    const submitBtn = screen.getAllByRole("button").find((b) => b.getAttribute("type") === "submit");
    expect(submitBtn).toBeDefined();
    expect(submitBtn).toBeDisabled();
  });

  it("submits typed mood through onMoodSubmit", () => {
    const onMoodSubmit = vi.fn();

    render(
      <PracticeView
        {...baseProps}
        moodInput="Testing my mood"
        onMoodInputChange={vi.fn()}
        onMoodSubmit={onMoodSubmit}
      />,
    );

    const form = screen.getByPlaceholderText(/feeling overwhelmed/i).closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(onMoodSubmit).toHaveBeenCalledTimes(1);
  });

  it("invokes onFeedbackOption when a feedback prompt option is chosen", async () => {
    const user = userEvent.setup();
    const onFeedbackOption = vi.fn();

    render(
      <PracticeView
        {...baseProps}
        showFeedbackPrompt
        dynamicPrompt={{
          question: "How is this space feeling?",
          options: ["Centering", "A bit intense"],
        }}
        onFeedbackOption={onFeedbackOption}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Centering" }));
    expect(onFeedbackOption).toHaveBeenCalledWith("Centering");
    expect(onFeedbackOption).toHaveBeenCalledTimes(1);
  });
});
