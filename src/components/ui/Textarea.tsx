import type { TextareaHTMLAttributes } from "react";
export function Textarea({
  label,
  error,
  id,
  className = "",
  rows = 5,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  const errorId = id ? id + "-error" : undefined;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <textarea
        id={id}
        rows={rows}
        className={"form-control " + className}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : props["aria-describedby"]}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
