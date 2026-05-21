"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, User, LogOut } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on onboarding pages
  if (pathname === "/" || pathname === "/setup" || pathname === "/preferences") return null;

  const links = [
    { href: "/browse", label: "استكشاف", icon: Home },
    { href: "/matches", label: "التوافقات", icon: Users },
    { href: "/profile", label: "ملفي", icon: User },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/browse" className="navbar-brand">
          <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--primary)", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>مودة</span>
        </Link>
        <div className="navbar-links">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={`nav-link ${isActive ? "active" : ""}`}>
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <a 
            href="/api/auth/logout" 
            className="nav-link" 
            style={{ color: "var(--danger)", marginLeft: "auto" }}
            title="تسجيل الخروج"
          >
            <LogOut size={20} />
            <span style={{ color: "inherit" }}>خروج</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
