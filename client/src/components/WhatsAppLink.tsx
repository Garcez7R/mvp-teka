import type { ReactNode } from "react";
import WhatsAppIcon from "@/components/WhatsAppIcon";

type WhatsAppLinkProps = {
  href: string;
  className?: string;
  iconClassName?: string;
  children: ReactNode;
};

export default function WhatsAppLink({
  href,
  className = "",
  iconClassName = "w-4 h-4",
  children,
}: WhatsAppLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <WhatsAppIcon className={iconClassName} />
      {children}
    </a>
  );
}

