import type { Metadata } from 'next';
import { AboutPage } from '@/components/about/AboutPage';

export const metadata: Metadata = {
  title: 'About | Flowculus',
  description:
    'Flowculus by Chu Nam Thắng and Trịnh Thuận Huê. Meet the developers and explore the project on GitHub.',
};

export default function Page() {
  return <AboutPage />;
}
