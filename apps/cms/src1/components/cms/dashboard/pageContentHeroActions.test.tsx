import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultHomePageContent } from '../../../data/pageContentSeed';
import { PageContentSection } from './CMSMainSections';
import { appendHeroBackgroundItem, appendHeroBackgroundItemWithMedia, assignHeroBackgroundMedia, handleAddHeroMediaClick } from './pageContentHeroActions';
import { toMediaReferenceValue } from '../../../features/media/assetReference';

describe('pageContentHeroActions', () => {
  it('adds a new hero slide item in CMS form state', () => {
    const updated = appendHeroBackgroundItem(defaultHomePageContent);

    expect(updated.heroBackgroundItems).toHaveLength(1);
    expect(updated.heroBackgroundItems[0]).toMatchObject({
      label: 'Slide 1',
      type: 'image',
      media: '',
      overlayOpacity: defaultHomePageContent.heroBackgroundOverlayOpacity,
    });
  });


  it('auto-enables rotation when a second slide is appended', () => {
    const first = appendHeroBackgroundItem(defaultHomePageContent);
    expect(first.heroBackgroundRotationEnabled).toBe(defaultHomePageContent.heroBackgroundRotationEnabled);

    const second = appendHeroBackgroundItem(first);
    expect(second.heroBackgroundItems).toHaveLength(2);
    expect(second.heroBackgroundRotationEnabled).toBe(true);
  });

  it('prevents default click navigation before adding media item', () => {
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const stopImmediatePropagation = vi.fn();

    const updated = handleAddHeroMediaClick(
      {
        preventDefault,
        stopPropagation,
        nativeEvent: {
          stopImmediatePropagation,
        },
      },
      defaultHomePageContent,
    );

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(updated.heroBackgroundItems).toHaveLength(1);
  });

  it('still appends a new item when no event object is provided', () => {
    const updated = handleAddHeroMediaClick(undefined, defaultHomePageContent);
    expect(updated.heroBackgroundItems).toHaveLength(1);
  });

  it('still appends a new item when click event omits navigation methods', () => {
    const updated = handleAddHeroMediaClick({ nativeEvent: {} }, defaultHomePageContent);
    expect(updated.heroBackgroundItems).toHaveLength(1);
  });

  it('assigns selected media to a specific hero background item field', () => {
    const withItem = appendHeroBackgroundItem(defaultHomePageContent);
    const targetItemId = withItem.heroBackgroundItems[0].id;
    const mediaReference = toMediaReferenceValue('asset-hero-1');

    const updated = assignHeroBackgroundMedia(withItem, targetItemId, 'desktopMedia', mediaReference);

    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(mediaReference);
  });

  it('keeps media fields coherent when assigning desktop media first', () => {
    const withItem = appendHeroBackgroundItem(defaultHomePageContent);
    const targetItemId = withItem.heroBackgroundItems[0].id;
    const mediaReference = toMediaReferenceValue('asset-desktop-only');

    const updated = assignHeroBackgroundMedia(withItem, targetItemId, 'desktopMedia', mediaReference);

    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].media).toBe(mediaReference);
  });

  it('hydrates media + desktop when tablet media is assigned first', () => {
    const withItem = appendHeroBackgroundItem(defaultHomePageContent);
    const targetItemId = withItem.heroBackgroundItems[0].id;
    const mediaReference = toMediaReferenceValue('asset-tablet-first');

    const updated = assignHeroBackgroundMedia(withItem, targetItemId, 'tabletMedia', mediaReference);

    expect(updated.heroBackgroundItems[0].tabletMedia).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].media).toBe(mediaReference);
  });

  it('creates a new hero background item pre-linked to uploaded media', () => {
    const mediaReference = toMediaReferenceValue('asset-uploaded');
    const updated = appendHeroBackgroundItemWithMedia(defaultHomePageContent, mediaReference);

    expect(updated.heroBackgroundItems).toHaveLength(1);
    expect(updated.heroBackgroundItems[0].media).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].tabletMedia).toBe(mediaReference);
  });

  it('normalizes uploaded media references when creating a pre-linked slide', () => {
    const mediaReference = `  ${toMediaReferenceValue('asset-uploaded')}  `;
    const updated = appendHeroBackgroundItemWithMedia(defaultHomePageContent, mediaReference);

    expect(updated.heroBackgroundItems[0].media).toBe(toMediaReferenceValue('asset-uploaded'));
    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(toMediaReferenceValue('asset-uploaded'));
    expect(updated.heroBackgroundItems[0].tabletMedia).toBe(toMediaReferenceValue('asset-uploaded'));
  });

  it('supports appending a slide even when legacy payload has no heroBackgroundItems array', () => {
    const legacyContent = { ...defaultHomePageContent, heroBackgroundItems: undefined } as unknown as typeof defaultHomePageContent;

    const updated = appendHeroBackgroundItem(legacyContent);

    expect(updated.heroBackgroundItems).toHaveLength(1);
    expect(updated.heroBackgroundItems[0].label).toBe('Slide 1');
  });

  it('hydrates desktop/tablet when assigning the generic media field first', () => {
    const withItem = appendHeroBackgroundItem(defaultHomePageContent);
    const targetItemId = withItem.heroBackgroundItems[0].id;
    const mediaReference = toMediaReferenceValue('asset-generic-media');

    const updated = assignHeroBackgroundMedia(withItem, targetItemId, 'media', mediaReference);

    expect(updated.heroBackgroundItems[0].media).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].desktopMedia).toBe(mediaReference);
    expect(updated.heroBackgroundItems[0].tabletMedia).toBe(mediaReference);
  });

  it('renders dedicated CMS slider actions without public navigation labels', () => {
    const html = renderToStaticMarkup(
      <PageContentSection
        homeContentError=""
        saveHomePageContent={async () => {}}
        homeContentSaving={false}
        hasUnsavedChanges={false}
        canEditContent
        resetHomePageContent={() => {}}
        openMediaLibrary={() => {}}
        heroMediaUploadError=""
        heroMediaUploadTarget={null}
        uploadHeroBackgroundMedia={async () => {}}
        homeContentForm={defaultHomePageContent}
        setHomeContentForm={() => {}}
        mediaFiles={[]}
      />,
    );

    expect(html).toContain('Ajouter une diapositive');
    expect(html).toContain('Ouvrir la médiathèque CMS');
    expect(html).toContain('Prévisualiser le site');
    expect(html).not.toContain('Retour au site');
    expect(html).not.toContain('Voir le site');
    expect(html).toContain('data-testid="hero-add-media-button"');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('data-testid="hero-add-media-button" href=');
  });

  it('keeps unresolved saved media references visible in select controls', () => {
    const withSlide = appendHeroBackgroundItem(defaultHomePageContent);
    const slideId = withSlide.heroBackgroundItems[0].id;
    const withMissingReference = assignHeroBackgroundMedia(withSlide, slideId, 'media', 'media:missing-asset');

    const html = renderToStaticMarkup(
      <PageContentSection
        homeContentError=""
        saveHomePageContent={async () => {}}
        homeContentSaving={false}
        hasUnsavedChanges={false}
        canEditContent
        resetHomePageContent={() => {}}
        openMediaLibrary={() => {}}
        heroMediaUploadError=""
        heroMediaUploadTarget={null}
        uploadHeroBackgroundMedia={async () => {}}
        homeContentForm={withMissingReference}
        setHomeContentForm={() => {}}
        mediaFiles={[]}
      />,
    );

    expect(html).toContain('Référence actuelle (introuvable): media:missing-asset');
  });

  it('keeps unresolved saved video references visible in select controls', () => {
    const withSlide = appendHeroBackgroundItem(defaultHomePageContent);
    const slideId = withSlide.heroBackgroundItems[0].id;
    const withMissingVideoReference = assignHeroBackgroundMedia(withSlide, slideId, 'videoMedia', 'media:missing-video');

    const html = renderToStaticMarkup(
      <PageContentSection
        homeContentError=""
        saveHomePageContent={async () => {}}
        homeContentSaving={false}
        hasUnsavedChanges={false}
        canEditContent
        resetHomePageContent={() => {}}
        openMediaLibrary={() => {}}
        heroMediaUploadError=""
        heroMediaUploadTarget={null}
        uploadHeroBackgroundMedia={async () => {}}
        homeContentForm={withMissingVideoReference}
        setHomeContentForm={() => {}}
        mediaFiles={[]}
      />,
    );

    expect(html).toContain('Référence actuelle (introuvable): media:missing-video');
  });

  it('renders hero preview safely when a slide exists and tone metadata is not explicitly set', () => {
    const withSlide = appendHeroBackgroundItem(defaultHomePageContent);

    expect(() =>
      renderToStaticMarkup(
        <PageContentSection
          homeContentError=""
          saveHomePageContent={async () => {}}
          homeContentSaving={false}
          hasUnsavedChanges={false}
          canEditContent
          resetHomePageContent={() => {}}
          openMediaLibrary={() => {}}
          heroMediaUploadError=""
          heroMediaUploadTarget={null}
          uploadHeroBackgroundMedia={async () => {}}
          homeContentForm={withSlide}
          setHomeContentForm={() => {}}
          mediaFiles={[]}
        />,
      ),
    ).not.toThrow();
  });

  it('renders professionalized hero management summaries and action labels', () => {
    const withSlide = appendHeroBackgroundItem(defaultHomePageContent);
    const html = renderToStaticMarkup(
      <PageContentSection
        homeContentError=""
        saveHomePageContent={async () => {}}
        homeContentSaving={false}
        hasUnsavedChanges
        canEditContent
        resetHomePageContent={() => {}}
        openMediaLibrary={() => {}}
        heroMediaUploadError=""
        heroMediaUploadTarget={null}
        uploadHeroBackgroundMedia={async () => {}}
        homeContentForm={withSlide}
        setHomeContentForm={() => {}}
        mediaFiles={[]}
      />,
    );

    expect(html).toContain('Slides configurées');
    expect(html).toContain('Médias résolus');
    expect(html).toContain('Contenu de slide');
    expect(html).toContain('Médias &amp; responsive');
    expect(html).toContain('Overlay, position et effets');
  });
});
