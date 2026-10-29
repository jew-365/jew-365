import { BRAND } from './colors';

export type SkyStop = { top: string; mid: string; bot: string; cloud: string };

export const SKY = {
  alot: { top: '#18215F', mid: '#4B3D8E', bot: '#9B6BA8', cloud: '#C9A6D6' },
  netz: { top: '#8DA3E0', mid: '#F2B7B4', bot: '#FFD9AE', cloud: '#FFD6CC' },
  morning: { top: '#76B6F2', mid: '#A8D4F6', bot: '#D8EDFA', cloud: BRAND.white },
  chatzot: { top: '#4B9DEB', mid: '#6DB4F1', bot: '#A8D5F8', cloud: BRAND.white },
  plag: { top: '#5E9FE0', mid: '#9CC5E8', bot: '#F5D9A2', cloud: '#FFF6E4' },
  shkia: { top: '#5C5AA8', mid: '#E4708C', bot: '#FFB05C', cloud: '#FFC8B0' },
  tzeit: { top: '#161D58', mid: '#2E3382', bot: '#6C5BA8', cloud: '#9A8CC8' },
  night: { top: '#070C1F', mid: '#0F1A3E', bot: '#1B2A58', cloud: '#7F8FC8' },
  predawn: { top: '#060A19', mid: '#0D1533', bot: '#18224D', cloud: '#7F8FC8' },
} as const satisfies Record<string, SkyStop>;

export const SKY_SCENE = {
  inkDark: '#0A1228',
  chipDark: '#080E22',
  ground: '#080C1E',
  sunLow: '#FF8A3D',
  sunHigh: '#FFE27A',
  sunEdgeLow: '#E8531F',
  sunEdgeHigh: '#FFB347',
  sunCenter: '#FFFDF0',
  moon: '#F6E7BF',
  tickRing: '#5B6584',
  arcStops: [
    ['0', '#C58BD9'],
    ['0.16', '#FF9FB0'],
    ['0.32', '#FFD27A'],
    ['0.5', '#FFF1A8'],
    ['0.68', '#FFC66B'],
    ['0.84', '#FF8A5C'],
    ['1', '#B07CD8'],
  ],
} as const;
