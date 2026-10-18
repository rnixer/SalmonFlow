import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5",
        outline:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 px-3 py-2",
        ghost: "text-slate-500 hover:bg-slate-100 px-2 py-2",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={twMerge(clsx(buttonVariants({ variant }), className))}
      {...props}
    />
  );
}
