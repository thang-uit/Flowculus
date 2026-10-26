'use client';

import { BookOpen, GithubLogo, Users } from '@phosphor-icons/react';
import { FlowculusLogo } from '@/components/branding/FlowculusLogo';
import { AppMenu } from '@/components/ui/AppMenu';
import { getReadingCopy } from '@/lib/i18n/knowledge/copy';
import { PROJECT_REPOSITORY } from '@/lib/knowledge/project';
import { usePreferencesStore } from '@/lib/use-preferences-store';

export function WorkspaceProjectMenu({ compact }: Readonly<{ compact: boolean }>) {
  const locale = usePreferencesStore((state) => state.locale);
  const copy = getReadingCopy(locale);
  return (
    <AppMenu
      label={`Flowculus · ${copy.navigation}`}
      align="start"
      triggerClassName="workspace-brand-trigger"
      trigger={<FlowculusLogo compact={compact} />}
      sections={[
        {
          id: 'project',
          actions: [
            {
              id: 'knowledge',
              label: copy.knowledge,
              href: '/knowledge',
              external: true,
              accessibleLabel: `${copy.knowledge} · ${copy.newTab}`,
              icon: BookOpen,
            },
            {
              id: 'about',
              label: copy.about,
              href: '/about',
              external: true,
              accessibleLabel: `${copy.about} · ${copy.newTab}`,
              icon: Users,
            },
            {
              id: 'github',
              label: copy.github,
              href: PROJECT_REPOSITORY,
              external: true,
              icon: GithubLogo,
            },
          ],
        },
      ]}
    />
  );
}
