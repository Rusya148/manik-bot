import { HTMLAttributes } from "react";
import clsx from "clsx";

type Props = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: Props) => (
  <div className={clsx("card p-4", className)} {...props} />
);
