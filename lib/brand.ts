import { Oswald, Roboto_Condensed } from 'next/font/google';

export const headingFont = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-heading',
});

export const bodyFont = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const brand = {
  navy: '#002d74',
  navyDeep: '#001f52',
  navyMid: '#003d8f',
  gold: '#faa200',
  goldSoft: '#fcd88a',
  ink: '#25303d',
  muted: '#606b78',
  line: '#d9dee7',
  surface: '#ffffff',
  page: '#f4f5f7',
  tint: '#e9eef7',
} as const;
