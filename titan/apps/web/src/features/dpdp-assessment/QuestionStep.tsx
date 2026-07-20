import type { Question } from "@titan/assessment-core";

export interface QuestionStepProps {
  question: Question;
  /** 1-based position, for the "Question N" label. */
  position: number;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}

// Discovery (ARCHITECTURE.md) found the original rendered answer options as
// `<div onclick>` with no accessible role/state, plus a hand-rolled global keydown
// listener standing in for keyboard support. A <fieldset>/<legend> with real
// <input type="radio"> gets an accessible group name, per-option accessible names,
// checked state, and full keyboard operability (Tab, Space, arrow keys) from the
// browser for free — nothing here reimplements what native elements already do.
export function QuestionStep({ question, position, value, onChange }: QuestionStepProps) {
  const hintId = question.hint ? `dpdp-q-${question.id}-hint` : undefined;

  if (question.type === "text") {
    const inputId = `dpdp-q-${question.id}`;
    return (
      <div className="dpdp-question">
        <p className="dpdp-question__number">Question {position}</p>
        <label htmlFor={inputId} className="dpdp-question__text">
          {question.text}
        </label>
        {question.hint && (
          <p id={hintId} className="dpdp-question__hint">
            {question.hint}
          </p>
        )}
        <input
          id={inputId}
          type="text"
          className="dpdp-form-input"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hintId}
          placeholder="e.g., Fintech, 25 employees, Mumbai"
        />
      </div>
    );
  }

  return (
    <fieldset className="dpdp-question">
      <legend className="dpdp-question__text">
        <span className="dpdp-question__number">Question {position}: </span>
        {question.text}
      </legend>
      {question.hint && <p className="dpdp-question__hint">{question.hint}</p>}
      <div className="dpdp-options">
        <label className={optionClass(value === true)}>
          <input
            type="radio"
            name={question.id}
            checked={value === true}
            onChange={() => onChange(true)}
          />
          <span className="dpdp-option__radio" aria-hidden="true" />
          <span>Yes, we have this in place</span>
        </label>
        <label className={optionClass(value === false)}>
          <input
            type="radio"
            name={question.id}
            checked={value === false}
            onChange={() => onChange(false)}
          />
          <span className="dpdp-option__radio" aria-hidden="true" />
          <span>No, we do not have this in place</span>
        </label>
      </div>
    </fieldset>
  );
}

function optionClass(selected: boolean): string {
  return ["dpdp-option", selected && "dpdp-option--selected"].filter(Boolean).join(" ");
}
