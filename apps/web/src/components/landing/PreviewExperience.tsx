'use client';

import { useRef, useState } from 'react';
import { ArrowUpRight, Sparkles, UsersRound } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeftIcon } from '@/components/shared/icons/ArrowLeftIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { cn } from '@/lib/utils';
import {
  PREVIEW_ITEMS,
  type PreviewItem,
} from '@/components/landing/previewContent';

gsap.registerPlugin(useGSAP);

type ExperienceStage = 'default' | 'focus' | 'details';

interface PreviewExperienceProps {
  isAuthenticating: boolean;
  selectedItemId: string | null;
  onAuthenticate: () => void;
  onSelectItem: (itemId: string | null) => void;
}

const CARD_POSITIONS = [
  'left-0 top-2 z-20 w-[78%] sm:left-[2%] sm:w-[58%] lg:top-8 lg:w-[62%]',
  'right-0 top-[118px] z-30 w-[76%] sm:right-[1%] sm:top-[92px] sm:w-[56%] lg:top-[126px] lg:w-[60%]',
  'left-[3%] top-[250px] z-40 w-[76%] sm:left-[8%] sm:top-[238px] sm:w-[56%] lg:top-[260px] lg:w-[60%]',
  'right-[2%] top-[374px] z-50 w-[76%] sm:right-[5%] sm:top-[352px] sm:w-[56%] lg:top-[394px] lg:w-[60%]',
];

const CARD_ROTATIONS = [-4, 5, -2, 4];

function PreviewTypeIcon({ item }: { item: PreviewItem }): React.JSX.Element {
  const iconClassName = 'h-5 w-5';

  return item.kind === 'article' ? (
    <ArticleIcon className={iconClassName} aria-hidden="true" />
  ) : (
    <TechTalkIcon className={iconClassName} aria-hidden="true" />
  );
}

export function PreviewExperience({
  isAuthenticating,
  selectedItemId,
  onAuthenticate,
  onSelectItem,
}: PreviewExperienceProps): React.JSX.Element {
  const scopeRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const cardsStageRef = useRef<HTMLDivElement>(null);
  const detailsPanelRef = useRef<HTMLElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasEnteredRef = useRef(false);
  const wasSelectedRef = useRef(false);
  const activeItemIdRef = useRef<string | null>(selectedItemId);
  const selectionVersionRef = useRef(0);
  const panelFrameRef = useRef<number | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(
    selectedItemId
  );
  const [stage, setStage] = useState<ExperienceStage>('default');
  const [isAnimating, setIsAnimating] = useState(false);

  const displayedItemId = activeItemId ?? selectedItemId;
  const selectedItem = PREVIEW_ITEMS.find(
    (item) => item.id === displayedItemId
  );

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-preview-card]');
      const cardSurfaces = gsap.utils.toArray<HTMLElement>(
        '[data-card-surface]'
      );
      const heroCopy = heroCopyRef.current;
      const cardsStage = cardsStageRef.current;
      const detailsPanel = detailsPanelRef.current;
      const panelContent = panelContentRef.current;
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      const selectionVersion = ++selectionVersionRef.current;

      timelineRef.current?.kill();
      if (panelFrameRef.current !== null) {
        cancelAnimationFrame(panelFrameRef.current);
        panelFrameRef.current = null;
      }
      gsap.killTweensOf([
        ...cards,
        ...cardSurfaces,
        heroCopy,
        cardsStage,
        detailsPanel,
        panelContent,
      ]);

      const updateActiveItem = (itemId: string | null) => {
        activeItemIdRef.current = itemId;
        setActiveItemId(itemId);
      };

      const getBackgroundCardVars = (card: HTMLElement) => {
        const cardIndex = cards.indexOf(card);

        return {
          x: cardIndex % 2 === 0 ? -24 : 24,
          y: cardIndex < 2 ? -12 : 16,
          scale: 0.91,
          opacity: 0.34,
          rotation: CARD_ROTATIONS[cardIndex] ?? 0,
          zIndex: cardIndex + 20,
        };
      };

      const getCenteredCardVars = (card: HTMLElement) => {
        if (!cardsStage) return { x: 0, y: 0 };

        const stageBounds = cardsStage.getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        const currentX = Number(gsap.getProperty(card, 'x')) || 0;
        const currentY = Number(gsap.getProperty(card, 'y')) || 0;

        return {
          x:
            currentX +
            stageBounds.left +
            stageBounds.width / 2 -
            (cardBounds.left + cardBounds.width / 2),
          y:
            currentY +
            stageBounds.top +
            stageBounds.height / 2 -
            (cardBounds.top + cardBounds.height / 2),
        };
      };

      const restoreCardRotations = () => {
        cards.forEach((card, index) => {
          gsap.set(card, {
            x: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            rotation: CARD_ROTATIONS[index] ?? 0,
            zIndex: index + 20,
          });
        });
      };

      const startFloating = () => {
        if (prefersReducedMotion) return;

        cardSurfaces.forEach((surface, index) => {
          gsap.to(surface, {
            y: index % 2 === 0 ? -7 : 7,
            duration: 2.8 + index * 0.25,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        });
      };

      const animateBackToDefault = () => {
        setStage('focus');
        setIsAnimating(true);

        if (prefersReducedMotion) {
          restoreCardRotations();
          gsap.set(cardSurfaces, { y: 0 });
          gsap.set(cardsStage, { xPercent: 0 });
          gsap.set(heroCopy, {
            autoAlpha: 1,
            x: 0,
            pointerEvents: 'auto',
          });
          gsap.set(detailsPanel, { autoAlpha: 0, x: 0, y: 0 });
          wasSelectedRef.current = false;
          updateActiveItem(null);
          setStage('default');
          setIsAnimating(false);
          return;
        }

        const timeline = gsap.timeline({
          defaults: { ease: 'power3.inOut' },
          onComplete: () => {
            wasSelectedRef.current = false;
            updateActiveItem(null);
            setStage('default');
            setIsAnimating(false);
            startFloating();
          },
        });

        timelineRef.current = timeline;
        timeline
          .to(detailsPanel, {
            autoAlpha: 0,
            x: isDesktop ? 48 : 0,
            y: isDesktop ? 0 : 24,
            duration: 0.35,
            pointerEvents: 'none',
          })
          .to(cardsStage, { xPercent: 0, duration: 0.6 }, isDesktop ? 0.08 : 0)
          .to(
            heroCopy,
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.5,
              pointerEvents: 'auto',
            },
            0.16
          )
          .to(
            cards,
            {
              x: 0,
              y: 0,
              scale: 1,
              opacity: 1,
              rotation: (index) => CARD_ROTATIONS[index] ?? 0,
              zIndex: (index) => index + 20,
              duration: 0.6,
              stagger: 0.035,
            },
            0.12
          );
      };

      if (!selectedItemId) {
        if (wasSelectedRef.current) {
          animateBackToDefault();
          return () => timelineRef.current?.kill();
        }

        setStage('default');
        setIsAnimating(false);
        restoreCardRotations();
        gsap.set(cardSurfaces, { y: 0 });
        gsap.set(cardsStage, { xPercent: 0 });
        gsap.set(heroCopy, { autoAlpha: 1, x: 0, pointerEvents: 'auto' });

        if (prefersReducedMotion || hasEnteredRef.current) {
          hasEnteredRef.current = true;
          startFloating();
          return () => gsap.killTweensOf(cardSurfaces);
        }

        const entranceTimeline = gsap.timeline({
          onComplete: () => {
            hasEnteredRef.current = true;
            startFloating();
          },
        });

        timelineRef.current = entranceTimeline;
        entranceTimeline
          .fromTo(
            heroCopy,
            { autoAlpha: 0, y: 22 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              ease: 'power3.out',
            }
          )
          .fromTo(
            cards,
            { autoAlpha: 0, y: 32, scale: 0.96 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.65,
              stagger: 0.1,
              ease: 'power3.out',
            },
            0.18
          );

        return () => {
          entranceTimeline.kill();
          gsap.killTweensOf(cardSurfaces);
        };
      }

      const activeCard = cards.find(
        (card) => card.dataset.previewCard === selectedItemId
      );
      const inactiveCards = cards.filter((card) => card !== activeCard);

      if (!activeCard || !cardsStage || !detailsPanel) return;

      const previousActiveItemId = activeItemIdRef.current;
      const previousActiveCard = cards.find(
        (card) => card.dataset.previewCard === previousActiveItemId
      );
      const isSwitchingCards =
        previousActiveItemId !== null &&
        previousActiveItemId !== selectedItemId &&
        previousActiveCard !== undefined;

      if (isSwitchingCards) {
        const previousBackgroundVars =
          getBackgroundCardVars(previousActiveCard);
        const centeredCardVars = getCenteredCardVars(activeCard);
        const settledBackgroundCards = inactiveCards.filter(
          (card) => card !== previousActiveCard
        );

        setStage('details');
        setIsAnimating(true);
        wasSelectedRef.current = true;
        gsap.set(cardSurfaces, { y: 0 });

        if (prefersReducedMotion) {
          cards.forEach((card) => {
            if (card === activeCard) {
              gsap.set(card, {
                ...centeredCardVars,
                scale: 1.06,
                rotation: 0,
                opacity: 1,
                zIndex: 80,
              });
              return;
            }

            gsap.set(card, getBackgroundCardVars(card));
          });
          gsap.set(heroCopy, {
            autoAlpha: isDesktop ? 0 : 1,
            x: isDesktop ? -48 : 0,
            pointerEvents: isDesktop ? 'none' : 'auto',
          });
          gsap.set(cardsStage, { xPercent: isDesktop ? -104 : 0 });
          gsap.set(detailsPanel, {
            autoAlpha: 1,
            x: 0,
            y: 0,
            pointerEvents: 'auto',
          });
          updateActiveItem(selectedItemId);
          gsap.set(panelContentRef.current, {
            autoAlpha: 1,
            x: 0,
            pointerEvents: 'auto',
          });
          setIsAnimating(false);
          return;
        }

        const switchTimeline = gsap.timeline({
          defaults: { ease: 'power3.inOut' },
        });

        timelineRef.current = switchTimeline;
        switchTimeline
          .to(
            detailsPanel,
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              duration: 0.2,
              pointerEvents: 'auto',
            },
            0
          )
          .to(cardsStage, { xPercent: isDesktop ? -104 : 0, duration: 0.35 }, 0)
          .to(
            heroCopy,
            {
              autoAlpha: isDesktop ? 0 : 1,
              x: isDesktop ? -48 : 0,
              duration: 0.25,
              pointerEvents: isDesktop ? 'none' : 'auto',
            },
            0
          )
          .to(
            panelContent,
            {
              autoAlpha: 0,
              x: -24,
              duration: 0.22,
              pointerEvents: 'none',
            },
            0
          )
          .to(
            previousActiveCard,
            { ...previousBackgroundVars, duration: 0.38 },
            0.06
          )
          .set(
            previousActiveCard,
            { zIndex: previousBackgroundVars.zIndex },
            0.44
          )
          .set(activeCard, { zIndex: 80 }, 0.44)
          .call(() => updateActiveItem(selectedItemId), [], 0.44)
          .to(
            activeCard,
            {
              ...centeredCardVars,
              scale: 1.08,
              rotation: 0,
              opacity: 1,
              zIndex: 80,
              duration: 0.48,
            },
            0.44
          );

        settledBackgroundCards.forEach((card) => {
          switchTimeline.to(
            card,
            { ...getBackgroundCardVars(card), duration: 0.35 },
            0.44
          );
        });

        switchTimeline.call(
          () => {
            panelFrameRef.current = requestAnimationFrame(() => {
              panelFrameRef.current = null;

              if (selectionVersion !== selectionVersionRef.current) return;

              const nextPanelContent = panelContentRef.current;

              if (!nextPanelContent) {
                setIsAnimating(false);
                return;
              }

              gsap.fromTo(
                nextPanelContent,
                { autoAlpha: 0, x: 24 },
                {
                  autoAlpha: 1,
                  x: 0,
                  duration: 0.32,
                  ease: 'power3.out',
                  pointerEvents: 'auto',
                  onComplete: () => {
                    if (selectionVersion === selectionVersionRef.current) {
                      setIsAnimating(false);
                    }
                  },
                }
              );
            });
          },
          [],
          0.94
        );

        return () => {
          switchTimeline.kill();
          if (panelFrameRef.current !== null) {
            cancelAnimationFrame(panelFrameRef.current);
            panelFrameRef.current = null;
          }
          gsap.killTweensOf(panelContentRef.current);
        };
      }

      wasSelectedRef.current = true;
      updateActiveItem(selectedItemId);
      setStage('focus');
      setIsAnimating(true);
      gsap.set(cardSurfaces, { y: 0 });

      const centeredCardVars = getCenteredCardVars(activeCard);

      if (prefersReducedMotion) {
        gsap.set(activeCard, {
          ...centeredCardVars,
          scale: 1.06,
          rotation: 0,
          opacity: 1,
          zIndex: 80,
        });
        gsap.set(inactiveCards, { opacity: 0.34, scale: 0.91 });
        gsap.set(heroCopy, {
          autoAlpha: isDesktop ? 0 : 1,
          x: isDesktop ? -48 : 0,
          pointerEvents: isDesktop ? 'none' : 'auto',
        });
        gsap.set(cardsStage, { xPercent: isDesktop ? -104 : 0 });
        gsap.set(detailsPanel, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          pointerEvents: 'auto',
        });
        setStage('details');
        setIsAnimating(false);
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete: () => setIsAnimating(false),
      });

      timelineRef.current = timeline;
      timeline
        .to(activeCard, {
          ...centeredCardVars,
          scale: 1.08,
          rotation: 0,
          opacity: 1,
          zIndex: 80,
          duration: 0.58,
        })
        .to(
          inactiveCards,
          {
            x: (index) => (index % 2 === 0 ? -24 : 24),
            y: (index) => (index < 2 ? -12 : 16),
            scale: 0.91,
            opacity: 0.34,
            duration: 0.5,
            stagger: 0.04,
          },
          0
        )
        .to({}, { duration: 0.24 })
        .call(() => setStage('details'));

      if (isDesktop) {
        timeline
          .to(
            heroCopy,
            {
              autoAlpha: 0,
              x: -48,
              duration: 0.48,
              pointerEvents: 'none',
            },
            'layout'
          )
          .to(cardsStage, { xPercent: -104, duration: 0.68 }, 'layout')
          .fromTo(
            detailsPanel,
            { autoAlpha: 0, x: 56 },
            {
              autoAlpha: 1,
              x: 0,
              duration: 0.55,
              pointerEvents: 'auto',
            },
            'layout+=0.14'
          );
      } else {
        timeline.fromTo(
          detailsPanel,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            pointerEvents: 'auto',
          },
          'layout'
        );
      }

      return () => {
        timeline.kill();
        gsap.killTweensOf(cardSurfaces);
      };
    },
    {
      scope: scopeRef,
      dependencies: [selectedItemId],
    }
  );

  const isDetailsStage = stage === 'details';

  return (
    <main
      ref={scopeRef}
      className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden bg-brand-bg"
    >
      <div className="pointer-events-none absolute -left-48 top-24 h-96 w-96 rounded-full bg-brand-red/[0.045] blur-3xl" />
      <div className="pointer-events-none absolute -right-36 bottom-0 h-[440px] w-[440px] rounded-full bg-white blur-3xl" />

      <section
        className="relative mx-auto max-w-[1440px] px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:min-h-[760px] lg:px-10 lg:py-0"
        aria-labelledby="landing-heading"
      >
        <div
          ref={heroCopyRef}
          className="hero-copy relative z-20 max-w-2xl lg:absolute lg:left-10 lg:top-1/2 lg:w-[43%] lg:-translate-y-1/2"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-red/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-red shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Built by the 1BT community
          </div>
          <h1
            id="landing-heading"
            className="font-display text-[clamp(2.75rem,7vw,5.75rem)] font-bold leading-[0.96] tracking-[-0.065em] text-brand-dark"
          >
            Knowledge grows when we{' '}
            <span className="text-brand-red">share it.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-brand-text-secondary sm:text-lg sm:leading-8">
            Discover practical articles and tech talks shaped by the lessons,
            ideas and experiences shared across the 1BT community.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onSelectItem('article-reliable-apis')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-red px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(204,0,0,0.2)] transition hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
            >
              Explore articles
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onSelectItem('tech-talk-cloud-lessons')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-brand-border bg-white px-6 text-sm font-semibold text-brand-dark transition hover:border-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
            >
              Browse tech talks
              <TechTalkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-brand-text-secondary">
            <span className="inline-flex items-center gap-2">
              <UsersRound
                className="h-4 w-4 text-brand-red"
                aria-hidden="true"
              />
              Community-led learning
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
              Practical knowledge
            </span>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0 lg:min-h-[760px]">
          <div
            ref={cardsStageRef}
            className="cards-stage relative h-[530px] w-full sm:mx-auto sm:h-[560px] sm:max-w-2xl lg:absolute lg:right-10 lg:top-1/2 lg:h-[590px] lg:w-[47%] lg:-translate-y-1/2"
            aria-label="Article and tech talk previews"
          >
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-red/10 bg-white/40" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-brand-border" />

            {PREVIEW_ITEMS.map((item, index) => {
              const isSelected = activeItemId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-preview-card={item.id}
                  onClick={() => onSelectItem(item.id)}
                  aria-label={`Preview ${item.label.toLowerCase()}: ${item.title}`}
                  aria-pressed={isSelected}
                  className={cn(
                    'preview-card group absolute cursor-pointer rounded-[24px] text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-4',
                    CARD_POSITIONS[index]
                  )}
                >
                  <span
                    data-card-surface
                    className={cn(
                      'block min-h-[180px] rounded-[24px] border bg-white p-5 shadow-[0_22px_60px_rgba(26,26,26,0.12)] transition-[border-color,box-shadow] group-hover:border-brand-red/70 group-hover:shadow-[0_26px_70px_rgba(26,26,26,0.18)] group-focus-visible:border-brand-red sm:p-6',
                      isSelected
                        ? 'border-2 border-brand-red'
                        : 'border-brand-border hover:border-brand-red/40'
                    )}
                  >
                    <span className="flex items-start justify-between gap-4">
                      <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-brand-red">
                        <PreviewTypeIcon item={item} />
                        {item.label}
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-brand-text-secondary"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-5 block font-display text-xl font-bold leading-tight tracking-[-0.035em] text-brand-dark sm:text-2xl">
                      {item.title}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-brand-text-secondary">
                      {item.excerpt}
                    </span>
                    <span className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-text-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
                      {item.meta}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {selectedItem && (
            <aside
              ref={detailsPanelRef}
              className="details-panel invisible relative z-20 mt-8 rounded-[28px] border border-brand-border bg-white p-6 opacity-0 shadow-[0_28px_80px_rgba(26,26,26,0.12)] sm:p-9 lg:absolute lg:right-10 lg:top-1/2 lg:mt-0 lg:w-[48%] lg:-translate-y-1/2 lg:p-10"
              aria-hidden={!isDetailsStage}
              aria-busy={isAnimating}
              aria-labelledby="preview-panel-title"
            >
              <button
                type="button"
                onClick={() => onSelectItem(null)}
                disabled={!isDetailsStage || isAnimating}
                tabIndex={isDetailsStage ? 0 : -1}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-border text-brand-dark transition hover:border-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:pointer-events-none"
                aria-label="Back to all previews"
              >
                <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>

              <div ref={panelContentRef}>
                <div className="mt-10 flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-brand-red">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red/10">
                    <PreviewTypeIcon item={selectedItem} />
                  </span>
                  {selectedItem.label}
                </div>

                <h2
                  id="preview-panel-title"
                  className="mt-6 font-display text-3xl font-bold leading-tight tracking-[-0.045em] text-brand-dark sm:text-4xl"
                >
                  {selectedItem.panelTitle}
                </h2>
                <p className="mt-5 text-base leading-7 text-brand-text-secondary sm:text-lg sm:leading-8">
                  {selectedItem.panelDescription}
                </p>

                <div className="mt-7 flex flex-wrap gap-2" aria-label="Topics">
                  {selectedItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5 text-xs font-semibold text-brand-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onAuthenticate}
                  disabled={isAuthenticating || isAnimating || !isDetailsStage}
                  tabIndex={isDetailsStage ? 0 : -1}
                  aria-label={
                    isAuthenticating
                      ? 'Signing in'
                      : 'Log in to explore with Google'
                  }
                  className="mt-9 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-red px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(204,0,0,0.2)] transition hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-brand-red-disabled sm:w-auto"
                >
                  {isAuthenticating ? 'Signing in...' : 'Log in to explore'}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </aside>
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          {stage === 'focus' && selectedItem
            ? `${selectedItem.title} selected.`
            : null}
          {isDetailsStage && selectedItem
            ? `${selectedItem.label} description opened.`
            : null}
        </p>
      </section>
    </main>
  );
}
