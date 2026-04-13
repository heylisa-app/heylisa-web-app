export type PostActeConfig = {
    subtitle: string;
    options: string[];
  };
  
  export const POST_ACTE_CONFIG: Record<string, PostActeConfig> = {
    gastro: {
      subtitle:
        "Pour votre activité de gastro-entérologie, Lisa peut déjà structurer les suivis liés aux endoscopies, aux courriers post-acte et aux résultats d’anapath.",
      options: [
        "Suivis après endoscopie / coloscopie",
        "Courriers liés aux résultats d’anapath",
        "Consignes et courriers post-intervention",
        "Tous les suivis post-actes fréquents",
      ],
    },
  
    dentiste: {
      subtitle:
        "Pour votre activité dentaire, Lisa peut déjà structurer les suivis post-extraction, implant et soins.",
      options: [
        "Suites d’extraction ou chirurgie",
        "Contrôles post-implant / cicatrisation",
        "Consignes post-soins et traitements",
        "Tous les suivis post-actes fréquents",
      ],
    },
  
    orl: {
      subtitle:
        "Pour votre activité ORL, Lisa peut déjà structurer les suivis post-acte et les courriers aux médecins traitants.",
      options: [
        "Suites opératoires et consignes",
        "Transmission des résultats",
        "Courriers au médecin traitant",
        "Tous les suivis post-actes fréquents",
      ],
    },
  
    dermatologue: {
      subtitle:
        "Pour votre activité en dermatologie, Lisa peut déjà structurer les suivis de biopsie, exérèse et résultats.",
      options: [
        "Suites d’exérèse ou biopsie",
        "Transmission des résultats d’anapath",
        "Consignes de surveillance",
        "Tous les suivis post-actes fréquents",
      ],
    },
  
    gynecologue: {
      subtitle:
        "Pour votre activité en gynécologie, Lisa peut déjà structurer les suivis post-examen et les courriers patients.",
      options: [
        "Suites d’examens et actes gynécologiques",
        "Transmission de résultats",
        "Courriers au médecin traitant",
        "Tous les suivis post-actes fréquents",
      ],
    },
  
    default: {
      subtitle:
        "Lisa peut déjà structurer automatiquement vos courriers et suivis post-actes selon votre pratique.",
      options: [
        "Courriers post-consultation",
        "Transmission de résultats",
        "Consignes post-actes",
        "Tous les suivis fréquents",
      ],
    },
  };