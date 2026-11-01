import type { SelectHTMLAttributes } from "react";
export function Select({
  label,
  error,
  options,
  id,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
  label?: string;
  error?: string;
}) {
  const errorId = id ? id + "-error" : undefined;
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        className={"form-control " + className}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : props["aria-describedby"]}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
