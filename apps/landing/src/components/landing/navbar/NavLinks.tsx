import { NAV_LINKS } from "@/data/site";

export function NavLinks() {
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="rounded-md px-3 py-2 text-[0.9375rem] font-medium text-muted transition-colors hover:text-heading"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
