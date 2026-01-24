import { InputHTMLAttributes } from "react";
import clsx from "clsx";

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: Props) => (
  <input className={clsx("input-base w-full text-sm", className)} {...props} />
);
