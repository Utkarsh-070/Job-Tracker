import type { InputHTMLAttributes } from "react";
export function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const errorId = id ? id + "-error" : undefined;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className={"form-control " + className}
        {...props}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [props["aria-describedby"], error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
