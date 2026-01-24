import { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({ className, ...props }: Props) => (
  <textarea
    className={clsx("input-base w-full text-sm min-h-[96px]", className)}
    {...props}
  />
);
