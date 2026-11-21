// Contenu éditorial du site. Modifiez ici les textes, liens et coordonnées.

export const CONTACT_URL = "https://experts-conseil-habitat.fr/";
export const ADDRESS = "Les bureaux de l'Arche, 13090 Aix-en-Provence";

// Écran d'accueil (message de l'agence au prospect)
// Lien du bouton : à remplacer par votre page de contact / prise de rendez-vous.
export const HERO_CTA_URL = "#";
export const HERO_CTA_LABEL = "Je découvre les possibilités gratuitement";

// Écran de fin (message de l'agence)
export const END_LINES = ["Pas un site assemblé, mais codé.", "Pas des mots pour remplir, mais pour faire agir."];
export const END_CTA_LABEL = "Je réserve mon échange gratuit";
export const END_CTA_URL = "#"; // à remplacer par le lien de prise de rendez-vous
export const PORTRAITS = ["/portrait-1.jpg", "/portrait-2.jpg"];
export const TEAM_TITLE = "Deux experts. Plus de 40 ans d'expérience réunis.";
export const TEAM = [
  { name: "Jeff", role: "Copywriter depuis plus de 20 ans", photo: PORTRAITS[0] },
  { name: "Marc", role: "Développeur web depuis plus de 20 ans", photo: PORTRAITS[1] },
];

export type Section = {
  id: string;
  index: string;
  short: string; // libellé court (navigation, points cliquables)
  title: string;
  text: string;
  points?: string[];
};

// L'ordre des sections pilote le scénario 3D (une section = un écran de scroll).
export const SECTIONS: Section[] = [
  {
    id: "accueil",
    index: "",
    short: "Accueil",
    title: "Votre site n'a plus de limites",
    text:
      "Voici une maquette 3D interactive, créée spécialement pour vous, qui illustre ce que nous sommes capables de réaliser pour votre futur site internet.",
  },
  {
    id: "humidite",
    index: "01",
    short: "Humidité",
    title: "Humidité ascensionnelle",
    text:
      "Les remontées capillaires migrent du sol vers vos murs : enduits qui cloquent, salpêtre, air malsain. Nous identifions la source et traitons à la base pour assécher durablement.",
    points: ["Mesures et diagnostic", "Traitement à la source", "Assèchement durable"],
  },
  {
    id: "facade",
    index: "02",
    short: "Façade",
    title: "Traitement de façade",
    text:
      "Imperméabiliser sans étouffer le bâti : nous nettoyons, réparons et protégeons vos façades contre les infiltrations et les intempéries.",
    points: ["Nettoyage", "Réparation des fissures", "Imperméabilisation"],
  },
  {
    id: "charpente",
    index: "03",
    short: "Charpente",
    title: "Charpente",
    text:
      "L'ossature de votre toit est inspectée pièce par pièce. Réparation, renforcement et entretien des bois pour une structure saine et durable.",
    points: ["Inspection des bois", "Réparation et renforcement", "Entretien préventif"],
  },
  {
    id: "isolation",
    index: "04",
    short: "Isolation",
    title: "Isolation & ventilation des combles",
    text:
      "Isolation thermique et phonique, ventilation des combles : le duo qui garde la chaleur l'hiver, la fraîcheur l'été, et évite la condensation.",
    points: ["Isolation thermique", "Isolation phonique", "Ventilation des combles"],
  },
  {
    id: "toiture",
    index: "05",
    short: "Toiture",
    title: "Toiture",
    text:
      "Rénovation et entretien de couverture, du voligeage jusqu'aux tuiles, pour un toit étanche qui traverse les saisons.",
    points: ["Rénovation", "Entretien", "Étanchéité"],
  },
  {
    id: "zinguerie",
    index: "06",
    short: "Zinguerie",
    title: "Zinguerie",
    text:
      "Gouttières, descentes et protections sur mesure : l'eau de pluie est évacuée loin de vos murs et de vos fondations.",
    points: ["Gouttières", "Descentes", "Protections sur mesure"],
  },
  {
    id: "air",
    index: "07",
    short: "Qualité de l'air",
    title: "Qualité de l'air intérieur",
    text:
      "Un air renouvelé, sain et sans humidité excessive, grâce à une ventilation adaptée à votre logement et à vos usages.",
    points: ["Renouvellement d'air", "Contrôle de l'humidité", "Confort au quotidien"],
  },
  {
    id: "rongeurs",
    index: "08",
    short: "Rongeurs",
    title: "Protection contre les rongeurs",
    text:
      "Grilles, closoirs et obturations : nous fermons durablement les accès sans dénaturer votre bâti.",
    points: ["Repérage des accès", "Obturations", "Protection durable"],
  },
  {
    id: "contact",
    index: "",
    short: "Contact",
    title: "Pas un site assemblé, mais codé.",
    text:
      "Ensemble, nous réunissons nos deux expertises pour créer des sites internet aussi performants techniquement que commercialement.",
  },
];
