import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SuperChase Manual',
  tagline: 'Executive OS Documentation & Operations',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://superchase-manual.up.railway.app',
  baseUrl: '/',

  organizationName: 'CPTV27',
  projectName: 'superchase',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Docs at root
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SuperChase',
      logo: {
        alt: 'SuperChase Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'systemSidebar',
          position: 'left',
          label: 'System',
        },
        {
          type: 'docSidebar',
          sidebarId: 'projectsSidebar',
          position: 'left',
          label: 'Projects',
        },
        {
          href: 'https://superchase-dashboard-production.up.railway.app',
          label: 'Dashboard',
          position: 'right',
        },
        {
          href: 'https://github.com/CPTV27/superchase',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'System',
          items: [
            { label: 'George (AI Hub)', to: '/system/george' },
            { label: 'API Reference', to: '/system/api' },
            { label: 'Ingest Flow', to: '/system/ingest-flow' },
          ],
        },
        {
          title: 'Projects',
          items: [
            { label: 'Scan2Plan', to: '/projects/s2p' },
            { label: 'Studio C', to: '/projects/studio-c' },
            { label: 'CPTV', to: '/projects/cptv' },
            { label: 'Tuthill Design', to: '/projects/tuthill' },
          ],
        },
        {
          title: 'Links',
          items: [
            { label: 'Dashboard', href: 'https://superchase-dashboard-production.up.railway.app' },
            { label: 'Railway', href: 'https://railway.app' },
          ],
        },
      ],
      copyright: `SuperChase Executive OS v2.3 · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
