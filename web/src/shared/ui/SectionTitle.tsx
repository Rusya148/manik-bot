import { HTMLAttributes } from "react";
import clsx from "clsx";

type Props = HTMLAttributes<HTMLHeadingElement>;

export const SectionTitle = ({ className, ...props }: Props) => (
  <h2 className={clsx("text-base font-semibold", className)} {...props} />
);
