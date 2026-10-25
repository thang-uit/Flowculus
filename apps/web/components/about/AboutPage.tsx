'use client';

import { ArrowRight, ArrowUpRight, GithubLogo } from '@phosphor-icons/react';
import Link from 'next/link';
import Image from 'next/image';

import { ReadingShell } from '@/components/site/ReadingShell';
import { WorkspaceLink } from '@/components/site/WorkspaceLink';
import { ProcessFigure } from '@/components/knowledge/ProcessFigure';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { DEVELOPERS, PROJECT_REPOSITORY } from '@/lib/knowledge/project';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function AboutPage() {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  return (
    <ReadingShell page="about">
      <main id="reading-main" className="about-main">
        <section className="about-intro">
          <div>
            <h1>{copy.aboutTitle}</h1>
            <p className="about-lead">{copy.aboutIntro}</p>
            <p>{copy.aboutBody}</p>
            <div className="about-actions">
              <WorkspaceLink href="/" className="reading-primary-link">
                {copy.model}
                <ArrowRight size={17} aria-hidden="true" />
              </WorkspaceLink>
              <Link href="/knowledge" className="reading-text-link">
                {copy.knowledge}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="about-process">
            <ProcessFigure diagram="request" caption={copy.figureAlt} />
            <div className="about-equation">
              <span>CT</span>
              <code>18 + 0.6 × 24 + 0.4 × 7</code>
              <strong>
                {new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(35.2)}{' '}
                <small>{copy.minutes}</small>
              </strong>
            </div>
          </div>
        </section>
        <section className="about-developers" aria-labelledby="developers-title">
          <h2 id="developers-title">{copy.developers}</h2>
          <div className="about-developer-grid">
            {DEVELOPERS.map((person) => (
              <article className="about-developer" key={person.handle}>
                <div className="about-initials" aria-hidden="true">
                  {person.initials}
                </div>
                <div>
                  <h3>{person.name}</h3>
                  <p>{copy.developerRole}</p>
                  <span className="about-handle">{person.handle}</span>
                </div>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring"
                  aria-label={`${copy.profile}: ${person.name}`}
                >
                  <GithubLogo size={24} aria-hidden="true" />
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
        </section>
        <section className="about-principles" aria-labelledby="principles-title">
          <h2 id="principles-title">{copy.principleTitle}</h2>
          <div>
            {copy.principles.map((principle) => (
              <article key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </article>
            ))}
          </div>
        </section>
        <figure className="about-demo">
          <div className="about-demo-window">
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span>Flowculus</span>
          </div>
          <Image
            src={locale === 'vi' ? '/demo/workspace-vi.webp' : '/demo/workspace.webp'}
            alt={copy.screenshotCaption}
            width={1440}
            height={900}
            sizes="(max-width: 1100px) 100vw, 1100px"
            unoptimized
            className="demo-image-light"
          />
          <Image
            src={
              locale === 'vi'
                ? '/demo/workspace-vi-dark.webp'
                : '/demo/workspace-dark.webp'
            }
            alt={copy.screenshotCaption}
            width={1440}
            height={900}
            sizes="(max-width: 1100px) 100vw, 1100px"
            unoptimized
            className="demo-image-dark"
          />
          <figcaption>{copy.screenshotCaption}</figcaption>
        </figure>
        <section className="about-repository">
          <GithubLogo size={36} aria-hidden="true" />
          <div>
            <h2>{copy.repoTitle}</h2>
            <p>{copy.repoDescription}</p>
          </div>
          <a
            href={PROJECT_REPOSITORY}
            className="reading-primary-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            thang-uit / Flowculus
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </section>
      </main>
    </ReadingShell>
  );
}
