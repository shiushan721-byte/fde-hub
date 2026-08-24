import { createContext, useContext } from 'react';
import type { HellomeAgentItem } from '../data/mockData';
import type { AgentSolution, FDEExpert } from '../types';
import type { HomeBannerItem } from '../../shared/homeDefaults';
import type { DemoSource } from './demoSource';

export interface HomeSettings {
  heroBrand: string;
  creatorCountLabel: string;
  sectionTitle: string;
}

export interface CatalogState {
  source: DemoSource;
  setSource: (source: DemoSource) => void;
  loading: boolean;
  error: string | null;
  banners: HomeBannerItem[];
  categories: string[];
  homeAgents: HellomeAgentItem[];
  experts: FDEExpert[];
  solutions: AgentSolution[];
  settings: HomeSettings;
  refresh: () => void;
}

export const CatalogContext = createContext<CatalogState | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
