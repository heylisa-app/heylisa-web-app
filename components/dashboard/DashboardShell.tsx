"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import InviteModal from "./InviteModal";
import styles from "./DashboardShell.module.css";

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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isInviteOpen, setIsInviteOpen] = useState(false);

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
                  <span className={styles.workspaceName}>Cabinet du Dr Martin</span>
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

                <button className={styles.profileBtn} type="button">
                  <span className={styles.profileAvatar}>BM</span>
                </button>
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