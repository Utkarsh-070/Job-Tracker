import type { ButtonHTMLAttributes } from "react";
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      type={type}
      className={
        "button button-" +
        variant +
        (size === "sm" ? " button-sm" : "") +
        " " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
