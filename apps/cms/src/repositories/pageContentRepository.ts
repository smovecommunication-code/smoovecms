import { defaultHomePageContent, type HomePageContentSettings } from '../data/pageContentSeed';
import { readFromStorage, writeToStorage } from './storage/localStorageStore';

const PAGE_CONTENT_STORAGE_KEY = 'smove_page_content';

interface PageContentPayload {
  home: HomePageContentSettings;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isTransitionStyle = (value: unknown): value is HomePageContentSettings['heroBackgroundTransitionStyle'] =>
  value === 'fade' || value === 'slide';
const isBackgroundType = (value: unknown): value is HomePageContentSettings['heroBackgroundItems'][number]['type'] =>
  value === 'image' || value === 'video';
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeHeroBackgroundItems = (value: unknown): HomePageContentSettings['heroBackgroundItems'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      const media = typeof entry.media === 'string' ? entry.media.trim() : '';
      const desktopMedia = typeof entry.desktopMedia === 'string' ? entry.desktopMedia.trim() : '';
      const tabletMedia = typeof entry.tabletMedia === 'string' ? entry.tabletMedia.trim() : '';
      const mobileMedia = typeof entry.mobileMedia === 'string' ? entry.mobileMedia.trim() : '';
      const videoMedia = typeof entry.videoMedia === 'string' ? entry.videoMedia.trim() : '';
      const requestedType = isBackgroundType(entry.type) ? entry.type : 'image';
      const primaryMedia = media || desktopMedia || tabletMedia || mobileMedia || (requestedType === 'video' ? videoMedia : '');
      if (!primaryMedia) return null;
      const overlayOpacityInput = typeof entry.overlayOpacity === 'number' ? entry.overlayOpacity : defaultHomePageContent.heroBackgroundOverlayOpacity;
      return {
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `hero-bg-${index + 1}`,
        sortOrder: typeof entry.sortOrder === 'number' && Number.isFinite(entry.sortOrder) ? Math.max(0, Math.round(entry.sortOrder)) : index,
        label: typeof entry.label === 'string' ? entry.label.trim() : '',
        title: typeof entry.title === 'string' ? entry.title.trim() : '',
        description: typeof entry.description === 'string' ? entry.description.trim() : '',
        ctaLabel: typeof entry.ctaLabel === 'string' ? entry.ctaLabel.trim() : '',
        ctaHref: typeof entry.ctaHref === 'string' ? entry.ctaHref.trim() : '',
        type: requestedType,
        media: primaryMedia,
        desktopMedia,
        tabletMedia,
        mobileMedia,
        videoMedia,
        alt: typeof entry.alt === 'string' ? entry.alt.trim() : '',
        overlayColor: typeof entry.overlayColor === 'string' && entry.overlayColor.trim() ? entry.overlayColor.trim() : '#04111f',
        overlayOpacity: clamp(overlayOpacityInput, 0, 0.9),
        position: typeof entry.position === 'string' ? entry.position.trim() || 'center' : 'center',
        size: entry.size === 'contain' ? 'contain' : 'cover',
        enableParallax: typeof entry.enableParallax === 'boolean' ? entry.enableParallax : true,
        enable3DEffects: typeof entry.enable3DEffects === 'boolean' ? entry.enable3DEffects : true,
      };
    })
    .filter((entry): entry is HomePageContentSettings['heroBackgroundItems'][number] => Boolean(entry));
};

const isHomePageContentSettings = (value: unknown): value is HomePageContentSettings => {
  if (!isRecord(value)) return false;
  const keys: Array<keyof HomePageContentSettings> = [
    'heroBadge',
    'heroTitleLine1',
    'heroTitleLine2',
    'heroDescription',
    'heroPrimaryCtaLabel',
    'heroPrimaryCtaHref',
    'heroSecondaryCtaLabel',
    'heroSecondaryCtaHref',
    'aboutBadge',
    'aboutTitle',
    'aboutParagraphOne',
    'aboutParagraphTwo',
    'aboutCtaLabel',
    'aboutCtaHref',
    'aboutImage',
    'servicesIntroTitle',
    'servicesIntroSubtitle',
    'portfolioBadge',
    'portfolioTitle',
    'portfolioSubtitle',
    'portfolioCtaLabel',
    'portfolioCtaHref',
    'blogBadge',
    'blogTitle',
    'blogSubtitle',
    'blogCtaLabel',
    'blogCtaHref',
    'contactTitle',
    'contactSubtitle',
    'contactSubmitLabel',
  ];

  return keys.every((key) => typeof value[key] === 'string') &&
    (value.heroBackgroundItems === undefined || Array.isArray(value.heroBackgroundItems)) &&
    (value.heroBackgroundRotationEnabled === undefined || typeof value.heroBackgroundRotationEnabled === 'boolean') &&
    (value.heroBackgroundAutoplay === undefined || typeof value.heroBackgroundAutoplay === 'boolean') &&
    (value.heroBackgroundIntervalMs === undefined || (typeof value.heroBackgroundIntervalMs === 'number' && Number.isFinite(value.heroBackgroundIntervalMs))) &&
    (value.heroBackgroundTransitionStyle === undefined || isTransitionStyle(value.heroBackgroundTransitionStyle)) &&
    (value.heroBackgroundOverlayOpacity === undefined || (typeof value.heroBackgroundOverlayOpacity === 'number' && Number.isFinite(value.heroBackgroundOverlayOpacity))) &&
    (value.heroBackgroundEnable3DEffects === undefined || typeof value.heroBackgroundEnable3DEffects === 'boolean') &&
    (value.heroBackgroundEnableParallax === undefined || typeof value.heroBackgroundEnableParallax === 'boolean');
};

const isPageContentPayload = (value: unknown): value is PageContentPayload =>
  isRecord(value) && isHomePageContentSettings(value.home);

const normalizeHomeContent = (value: HomePageContentSettings): HomePageContentSettings => ({
  ...defaultHomePageContent,
  ...value,
  heroBadge: value.heroBadge.trim() || defaultHomePageContent.heroBadge,
  heroTitleLine1: value.heroTitleLine1.trim() || defaultHomePageContent.heroTitleLine1,
  heroTitleLine2: value.heroTitleLine2.trim() || defaultHomePageContent.heroTitleLine2,
  heroDescription: value.heroDescription.trim() || defaultHomePageContent.heroDescription,
  heroPrimaryCtaLabel: value.heroPrimaryCtaLabel.trim() || defaultHomePageContent.heroPrimaryCtaLabel,
  heroPrimaryCtaHref: value.heroPrimaryCtaHref.trim() || defaultHomePageContent.heroPrimaryCtaHref,
  heroSecondaryCtaLabel: value.heroSecondaryCtaLabel.trim() || defaultHomePageContent.heroSecondaryCtaLabel,
  heroSecondaryCtaHref: value.heroSecondaryCtaHref.trim() || defaultHomePageContent.heroSecondaryCtaHref,
  heroBackgroundItems: normalizeHeroBackgroundItems(value.heroBackgroundItems),
  heroBackgroundRotationEnabled: typeof value.heroBackgroundRotationEnabled === 'boolean'
    ? value.heroBackgroundRotationEnabled
    : defaultHomePageContent.heroBackgroundRotationEnabled,
  heroBackgroundAutoplay: typeof value.heroBackgroundAutoplay === 'boolean'
    ? value.heroBackgroundAutoplay
    : defaultHomePageContent.heroBackgroundAutoplay,
  heroBackgroundIntervalMs: clamp(Math.round(value.heroBackgroundIntervalMs || defaultHomePageContent.heroBackgroundIntervalMs), 2000, 30000),
  heroBackgroundTransitionStyle: isTransitionStyle(value.heroBackgroundTransitionStyle)
    ? value.heroBackgroundTransitionStyle
    : defaultHomePageContent.heroBackgroundTransitionStyle,
  heroBackgroundOverlayOpacity: clamp(value.heroBackgroundOverlayOpacity ?? defaultHomePageContent.heroBackgroundOverlayOpacity, 0.1, 0.9),
  heroBackgroundEnable3DEffects: value.heroBackgroundEnable3DEffects !== false,
  heroBackgroundEnableParallax: value.heroBackgroundEnableParallax !== false,
  aboutBadge: value.aboutBadge.trim() || defaultHomePageContent.aboutBadge,
  aboutTitle: value.aboutTitle.trim() || defaultHomePageContent.aboutTitle,
  aboutParagraphOne: value.aboutParagraphOne.trim() || defaultHomePageContent.aboutParagraphOne,
  aboutParagraphTwo: value.aboutParagraphTwo.trim() || defaultHomePageContent.aboutParagraphTwo,
  aboutCtaLabel: value.aboutCtaLabel.trim() || defaultHomePageContent.aboutCtaLabel,
  aboutCtaHref: value.aboutCtaHref.trim() || defaultHomePageContent.aboutCtaHref,
  aboutImage: value.aboutImage.trim(),
  servicesIntroTitle: value.servicesIntroTitle.trim() || defaultHomePageContent.servicesIntroTitle,
  servicesIntroSubtitle: value.servicesIntroSubtitle.trim() || defaultHomePageContent.servicesIntroSubtitle,
  portfolioBadge: value.portfolioBadge.trim() || defaultHomePageContent.portfolioBadge,
  portfolioTitle: value.portfolioTitle.trim() || defaultHomePageContent.portfolioTitle,
  portfolioSubtitle: value.portfolioSubtitle.trim() || defaultHomePageContent.portfolioSubtitle,
  portfolioCtaLabel: value.portfolioCtaLabel.trim() || defaultHomePageContent.portfolioCtaLabel,
  portfolioCtaHref: value.portfolioCtaHref.trim() || defaultHomePageContent.portfolioCtaHref,
  blogBadge: value.blogBadge.trim() || defaultHomePageContent.blogBadge,
  blogTitle: value.blogTitle.trim() || defaultHomePageContent.blogTitle,
  blogSubtitle: value.blogSubtitle.trim() || defaultHomePageContent.blogSubtitle,
  blogCtaLabel: value.blogCtaLabel.trim() || defaultHomePageContent.blogCtaLabel,
  blogCtaHref: value.blogCtaHref.trim() || defaultHomePageContent.blogCtaHref,
  contactTitle: value.contactTitle.trim() || defaultHomePageContent.contactTitle,
  contactSubtitle: value.contactSubtitle.trim() || defaultHomePageContent.contactSubtitle,
  contactSubmitLabel: value.contactSubmitLabel.trim() || defaultHomePageContent.contactSubmitLabel,
});

export interface PageContentRepository {
  getHomePageContent(): HomePageContentSettings;
  saveHomePageContent(content: HomePageContentSettings): HomePageContentSettings;
}

class LocalPageContentRepository implements PageContentRepository {
  private getPayload(): PageContentPayload {
    const payload = readFromStorage(
      PAGE_CONTENT_STORAGE_KEY,
      isPageContentPayload,
      { home: defaultHomePageContent },
      { persistFallback: true },
    );

    const normalized: PageContentPayload = { home: normalizeHomeContent(payload.home) };

    if (JSON.stringify(payload) !== JSON.stringify(normalized)) {
      writeToStorage(PAGE_CONTENT_STORAGE_KEY, normalized);
    }

    return normalized;
  }

  getHomePageContent(): HomePageContentSettings {
    return this.getPayload().home;
  }

  saveHomePageContent(content: HomePageContentSettings): HomePageContentSettings {
    const normalized = normalizeHomeContent(content);
    writeToStorage(PAGE_CONTENT_STORAGE_KEY, { home: normalized });
    return normalized;
  }
}

export const pageContentRepository: PageContentRepository = new LocalPageContentRepository();
