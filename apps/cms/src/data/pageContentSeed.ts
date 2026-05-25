export type HeroBackgroundTransitionStyle = 'fade' | 'slide';
export type HeroBackgroundMediaFit = 'cover' | 'contain';
export type HeroBackgroundMediaPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | string;
export type HeroBackgroundType = 'image' | 'video';

export interface HeroBackgroundItem {
  id: string;
  sortOrder: number;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  type: HeroBackgroundType;
  media: string;
  desktopMedia: string;
  tabletMedia: string;
  mobileMedia: string;
  videoMedia: string;
  alt: string;
  overlayColor: string;
  overlayOpacity: number;
  position: HeroBackgroundMediaPosition;
  size: HeroBackgroundMediaFit;
  enableParallax: boolean;
  enable3DEffects: boolean;
}

export interface HomePageContentSettings {
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDescription: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
  heroBackgroundItems: HeroBackgroundItem[];
  heroBackgroundRotationEnabled: boolean;
  heroBackgroundAutoplay: boolean;
  heroBackgroundIntervalMs: number;
  heroBackgroundTransitionStyle: HeroBackgroundTransitionStyle;
  heroBackgroundOverlayOpacity: number;
  heroBackgroundEnable3DEffects: boolean;
  heroBackgroundEnableParallax: boolean;
  aboutBadge: string;
  aboutTitle: string;
  aboutParagraphOne: string;
  aboutParagraphTwo: string;
  aboutCtaLabel: string;
  aboutCtaHref: string;
  aboutImage: string;
  servicesIntroTitle: string;
  servicesIntroSubtitle: string;
  portfolioBadge: string;
  portfolioTitle: string;
  portfolioSubtitle: string;
  portfolioCtaLabel: string;
  portfolioCtaHref: string;
  blogBadge: string;
  blogTitle: string;
  blogSubtitle: string;
  blogCtaLabel: string;
  blogCtaHref: string;
  contactTitle: string;
  contactSubtitle: string;
  contactSubmitLabel: string;
}

export const defaultHomePageContent: HomePageContentSettings = {
  heroBadge: 'Agence de communication',
  heroTitleLine1: 'Donnez du relief',
  heroTitleLine2: 'à votre communication',
  heroDescription:
    'Un hero premium avec animation 3D légère, pour valoriser votre image de marque et présenter vos services avec impact.',
  heroPrimaryCtaLabel: 'Découvrir nos services',
  heroPrimaryCtaHref: '#services',
  heroSecondaryCtaLabel: 'Lancer un projet',
  heroSecondaryCtaHref: '#contact',
  heroBackgroundItems: [],
  heroBackgroundRotationEnabled: false,
  heroBackgroundAutoplay: true,
  heroBackgroundIntervalMs: 6000,
  heroBackgroundTransitionStyle: 'fade',
  heroBackgroundOverlayOpacity: 0.45,
  heroBackgroundEnable3DEffects: true,
  heroBackgroundEnableParallax: true,
  aboutBadge: 'À PROPOS DE NOUS',
  aboutTitle: 'Innovation & Excellence Digitale',
  aboutParagraphOne:
    "SMOVE Communication est une agence digitale basée en Côte d'Ivoire, spécialisée dans la création de solutions digitales innovantes. Nous accompagnons les entreprises dans leur transformation digitale avec passion et expertise.",
  aboutParagraphTwo:
    'Notre équipe de professionnels talentueux combine créativité, technologie et stratégie pour créer des expériences digitales qui marquent les esprits et génèrent des résultats mesurables.',
  aboutCtaLabel: 'Découvrir notre équipe',
  aboutCtaHref: '#portfolio',
  aboutImage: '',
  servicesIntroTitle: 'Ce que nous faisons',
  servicesIntroSubtitle: 'Des solutions digitales complètes pour propulser votre entreprise vers le succès',
  portfolioBadge: 'PORTFOLIO',
  portfolioTitle: 'Nos derniers projets',
  portfolioSubtitle: 'Découvrez comment nous avons aidé nos clients à atteindre leurs objectifs',
  portfolioCtaLabel: 'Voir tous nos projets',
  portfolioCtaHref: '#projects',
  blogBadge: 'BLOG',
  blogTitle: 'Derniers articles',
  blogSubtitle: 'Actualités, conseils et insights sur le digital',
  blogCtaLabel: 'Voir tous les articles',
  blogCtaHref: '#blog',
  contactTitle: 'Travaillons ensemble',
  contactSubtitle:
    'Vous avez un projet en tête ? Contactez-nous et discutons de la manière dont nous pouvons vous aider à le réaliser.',
  contactSubmitLabel: 'Envoyer le message',
};
