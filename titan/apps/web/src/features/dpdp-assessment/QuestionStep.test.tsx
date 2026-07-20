import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import type { Question } from "@titan/assessment-core";
import { QuestionStep } from "./QuestionStep.js";

const textQuestion: Question = {
  id: "company_info",
  type: "text",
  text: "What is your company name, size, and sector?",
  hint: "Example hint text",
};

const booleanQuestion: Question = {
  id: "has_dpo",
  type: "boolean",
  riskField: "critical",
  text: "Do you have a Data Protection Officer (DPO) appointed?",
  hint: "DPDP Section 10 detail",
  penalty: "₹150 crore",
  section: "Section 10",
};

/** Owns state itself, like a real caller would — avoids asserting on React's
 * internal reset behavior for a controlled input whose value prop never changes. */
function ControlledTextQuestion() {
  const [value, setValue] = useState("");
  return (
    <QuestionStep
      question={textQuestion}
      position={1}
      value={value}
      onChange={(v) => setValue(v as string)}
    />
  );
}

describe("QuestionStep — text question", () => {
  it("renders a labeled text input that reports each keystroke back", async () => {
    const user = userEvent.setup();
    render(<ControlledTextQuestion />);

    const input = screen.getByLabelText(textQuestion.text);
    await user.type(input, "Acme");

    expect(input).toHaveValue("Acme");
  });

  it("associates the hint with the input via aria-describedby", () => {
    render(
      <QuestionStep question={textQuestion} position={1} value={undefined} onChange={vi.fn()} />,
    );
    const input = screen.getByLabelText(textQuestion.text);
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? "")).toHaveTextContent("Example hint text");
  });
});

describe("QuestionStep — boolean question", () => {
  const expectedGroupName = `Question 3: ${booleanQuestion.text}`;

  it("renders as a real, keyboard-operable radio group with an accessible group name", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionStep
        question={booleanQuestion}
        position={3}
        value={undefined}
        onChange={onChange}
      />,
    );

    const group = screen.getByRole("group", { name: expectedGroupName });
    expect(group).toBeInTheDocument();

    const yes = screen.getByRole("radio", { name: "Yes, we have this in place" });
    const no = screen.getByRole("radio", { name: "No, we do not have this in place" });
    expect(yes).not.toBeChecked();
    expect(no).not.toBeChecked();

    await user.tab();
    expect(yes).toHaveFocus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects the current answer as checked state", () => {
    render(
      <QuestionStep question={booleanQuestion} position={3} value={false} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("radio", { name: "No, we do not have this in place" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Yes, we have this in place" })).not.toBeChecked();
  });

  it("has no structural accessibility violations", async () => {
    const { container } = render(
      <QuestionStep question={booleanQuestion} position={3} value={undefined} onChange={vi.fn()} />,
    );
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
