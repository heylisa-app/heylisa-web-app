"use client";

import { useMemo, useState } from "react";
import styles from "./InviteModal.module.css";

type InviteRole =
  | "Médecin"
  | "Secrétaire médicale"
  | "Assistant(e) médical(e)"
  | "Collaborateur"
  | "Direction / gestion"
  | "Autre";

const ROLE_OPTIONS: { label: InviteRole; description: string }[] = [
  {
    label: "Médecin",
    description: "Accès complet au suivi médical et aux outils de pilotage du cabinet.",
  },
  {
    label: "Secrétaire médicale",
    description: "Gestion des échanges, rendez-vous, relances et coordination administrative.",
  },
  {
    label: "Assistant(e) médical(e)",
    description: "Accès aux tâches de préparation, suivi patient et support opérationnel.",
  },
  {
    label: "Collaborateur",
    description: "Accès aux éléments partagés selon l’organisation du cabinet.",
  },
  {
    label: "Direction / gestion",
    description: "Vision transverse sur l’activité, le suivi administratif et les indicateurs.",
  },
  {
    label: "Autre",
    description: "Rôle libre à préciser selon le fonctionnement de votre structure.",
  },
];

type InviteModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<InviteRole>("Médecin");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const selectedRole = useMemo(
    () => ROLE_OPTIONS.find((option) => option.label === role) ?? ROLE_OPTIONS[0],
    [role]
  );

  const canSubmit = emails.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={() => {
        setIsRoleMenuOpen(false);
        onClose();
      }}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fermer"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className={styles.title}>Invitez des personnes gratuitement</h2>

        <div className={styles.fieldBlock}>
          <label className={styles.label}>Inviter par e-mail</label>
          <input
            type="text"
            className={styles.input}
            placeholder="E-mails, séparés par des virgules ou des espaces"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        <div className={styles.fieldBlock}>
          <label className={styles.label}>Inviter comme</label>

          <div className={styles.roleWrap}>
            <button
              type="button"
              className={styles.roleTrigger}
              onClick={() => setIsRoleMenuOpen((prev) => !prev)}
            >
              <span className={styles.roleIconBox}>
                <span className={styles.roleIcon}>◔</span>
              </span>

              <span className={styles.roleContent}>
                <span className={styles.roleTopLine}>
                  <span className={styles.roleName}>{selectedRole.label}</span>
                  <span className={styles.roleChevron}>⌃</span>
                </span>

                <span className={styles.roleDescription}>
                  {selectedRole.description}
                </span>
              </span>
            </button>

            {isRoleMenuOpen && (
              <div className={styles.roleMenu}>
                {ROLE_OPTIONS.map((option) => {
                  const active = option.label === role;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={`${styles.roleOption} ${active ? styles.roleOptionActive : ""}`}
                      onClick={() => {
                        setRole(option.label);
                        setIsRoleMenuOpen(false);
                      }}
                    >
                      <div className={styles.roleOptionText}>
                        <div className={styles.roleOptionLabel}>{option.label}</div>
                        <div className={styles.roleOptionDescription}>
                          {option.description}
                        </div>
                      </div>

                      {active && <span className={styles.roleCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Annuler
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            disabled={!canSubmit}
            onClick={() => {
              console.log("Invitations :", { emails, role });
              setIsRoleMenuOpen(false);
              onClose();
            }}
          >
            Envoyer une invitation gratuite
          </button>
        </div>
      </div>
    </div>
  );
}