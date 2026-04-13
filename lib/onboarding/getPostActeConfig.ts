import { POST_ACTE_CONFIG } from "./postActeConfig";

export function getPostActeConfig(specialty?: string) {
  if (!specialty) return POST_ACTE_CONFIG.default;

  const key = specialty.toLowerCase();

  if (key.includes("gastro")) return POST_ACTE_CONFIG.gastro;
  if (key.includes("dent")) return POST_ACTE_CONFIG.dentiste;
  if (key.includes("orl")) return POST_ACTE_CONFIG.orl;
  if (key.includes("derm")) return POST_ACTE_CONFIG.dermatologue;
  if (key.includes("gyne")) return POST_ACTE_CONFIG.gynecologue;

  return POST_ACTE_CONFIG.default;
}