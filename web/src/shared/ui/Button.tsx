import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const styles: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-accent text-[var(--app-accent-text)]",
  secondary:
    "bg-[color:var(--app-card)] border border-[color:var(--app-border)]",
  ghost: "bg-transparent text-[color:var(--app-text)]",
};

export const Button = ({ variant = "primary", className, ...props }: Props) => (
  <button
    className={clsx(
      "rounded-[14px] px-4 py-3 text-sm font-medium transition active:scale-[0.98]",
      styles[variant],
      className,
    )}
    {...props}
  />
);
