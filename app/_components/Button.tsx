import { ButtonHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  priority?: "primary" | "secondary";
  variant?: "filled" | "outlined" | "text";
  icon?: LucideIcon;
}

/**
 * 버튼 컴포넌트
 * priority: primary (기본), secondary
 * variant: filled (기본), outlined, text
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      priority = "primary",
      variant = "filled",
      icon: Icon,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

    const styles = {
      primary: {
        filled:
          "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
        outlined:
          "border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900",
        text: "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800",
      },
      secondary: {
        filled:
          "bg-zinc-500 text-white hover:bg-zinc-400 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500",
        outlined:
          "border border-zinc-400 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800",
        text: "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800",
      },
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${styles[priority][variant]} ${className}`}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
