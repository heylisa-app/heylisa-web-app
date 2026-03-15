"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import InviteModal from "./InviteModal";
import styles from "./DashboardShell.module.css";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  activeClass: string;
};

const topItems: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: "/imgs/Home.png", activeClass: "activeHome" },
  { href: "/dashboard/calendar", label: "Rendez-vous", icon: "/imgs/calendar.png", activeClass: "activeAgenda" },
  { href: "/dashboard/chat", label: "Parler à Lisa", icon: "/imgs/chat_def.png", activeClass: "activeMessages" },
  { href: "/dashboard/patients", label: "Patients", icon: "/imgs/patients.png", activeClass: "activeContacts" },
  { href: "/dashboard/protocols", label: "Protocole", icon: "/imgs/protocole.png", activeClass: "activeProtocole" },
];

const bottomItems: NavItem[] = [
  { href: "/dashboard/invite", label: "Inviter", icon: "/imgs/invite.png", activeClass: "activeInvite" },
  { href: "/dashboard/plan", label: "Formule", icon: "/imgs/docs.png", activeClass: "activePlan" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardShellProps = {
  children: React.ReactNode;
  userDisplayName: string;
  userInitials: string;
  cabinetName: string;
};

export default function DashboardShell({
  children,
  userDisplayName,
  userInitials,
  cabinetName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      window.location.href = "https://heylisa.io/signup";
    } catch (error) {
      console.error("Logout error", error);
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <main className={styles.dashboardShell}>
        <section className={styles.dashboard}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarTop}>
                {topItems.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        styles.navItem,
                        styles[item.activeClass],
                        active ? styles.isActive : "",
                      ].join(" ")}
                    >
                      <span className={styles.navIconWrap}>
                        <span className={styles.navGlow} />
                        <img className={styles.navIcon} src={item.icon} alt="" />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className={styles.sidebarBottom}>
                {bottomItems.map((item) => {
                  if (item.href === "/dashboard/invite") {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => setIsInviteOpen(true)}
                        className={[styles.navItem, styles[item.activeClass]].join(" ")}
                      >
                        <span className={styles.navIconWrap}>
                          <span className={styles.navGlow} />
                          <img className={styles.navIcon} src={item.icon} alt="" />
                        </span>
                        <span className={styles.navLabel}>{item.label}</span>
                      </button>
                    );
                  }

                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        styles.navItem,
                        styles[item.activeClass],
                        active ? styles.isActive : "",
                      ].join(" ")}
                    >
                      <span className={styles.navIconWrap}>
                        <span className={styles.navGlow} />
                        <img className={styles.navIcon} src={item.icon} alt="" />
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className={styles.mainShell}>
            <header className={styles.topbar}>
              <div className={styles.topbarLeft}>
                <button className={styles.workspaceSwitcher} type="button">
                <span className={styles.workspaceName}>{cabinetName}</span>
                  <span className={styles.workspaceChevron} />
                </button>
              </div>

              <div className={styles.topbarCenter}>
                <div className={styles.searchWrap}>
                  <img className={styles.searchIcon} src="/imgs/search.png" alt="" />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Rechercher"
                    autoComplete="off"
                  />
                  <span className={styles.searchAvatar}>
                    <img src="/imgs/Lisa_Avatar-min.webp" alt="" />
                  </span>
                </div>
              </div>

              <div className={styles.topbarRight}>
                <button className={styles.microBtn} type="button" aria-label="Ajouter une note vocale">
                  <img src="/imgs/mic-notes.png" alt="" />
                </button>

                <div className={styles.profileMenuWrap} ref={profileMenuRef}>
                  <button
                    className={styles.profileBtn}
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isProfileMenuOpen}
                  >
                  <span className={styles.profileAvatar}>
                    {userInitials}
                    <span className={styles.profileOnlineDot} />
                  </span>
                  </button>

                  {isProfileMenuOpen && (
                  <div className={styles.profileDropdown} role="menu">
                    <div className={styles.profileDropdownHeader}>
                      <div className={styles.profileDropdownName}>{userDisplayName}</div>
                      <div className={styles.profileDropdownStatus}>En ligne</div>
                    </div>

                    <button
                      type="button"
                      className={styles.profileDropdownItem}
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? "Déconnexion..." : "Se déconnecter"}
                    </button>
                  </div>
                )}
                </div>
              </div>
            </header>

            <section className={styles.content}>
              <div className={styles.contentInner}>{children}</div>
            </section>
          </div>
        </section>
      </main>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </>
  );
}