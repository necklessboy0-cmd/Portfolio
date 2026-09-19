"use client";

import { personal } from "@/data/resume";
import { GitHubIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon } from "./icons";

function SocialLinks({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const items = [
    {
      label: "GitHub",
      href: personal.github,
      Icon: GitHubIcon,
    },
    {
      label: "LinkedIn",
      href: personal.linkedin,
      Icon: LinkedInIcon,
    },
    {
      label: "Instagram",
      href: personal.instagram,
      Icon: InstagramIcon,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/${personal.whatsappNumber}`,
      Icon: WhatsAppIcon,
    },
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {items.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open my ${label}`}
          title={label}
          className="social-icon inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-nebula-300"
        >
          <Icon size={size} />
        </a>
      ))}
    </div>
  );
}

export function personalSocials(props: { size?: number; className?: string }) {
  return <SocialLinks {...props} />;
}

export default SocialLinks;