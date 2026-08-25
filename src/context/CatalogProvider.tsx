import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CatalogContext, CatalogState, HomeSettings } from '../lib/catalog';
import { api } from '../lib/api';
import { getDemoSource, setDemoSource, DemoSource } from '../lib/demoSource';
import { defaultHomeBanners, defaultHomeCategories, HomeBannerItem } from '../../shared/homeDefaults';
import {
  mockHellomeHomeAgents,
  mockExperts,
  mockAgentSolutions,
  HellomeAgentItem
} from '../data/mockData';
import { AgentSolution } from '../types';
import { sortExpertsForPublic } from '../lib/sortExperts';

const defaultSettings: HomeSettings = {
  heroBrand: 'Hellome',
  creatorCountLabel: '已入驻 100+ 认证创作者与工作室',
  sectionTitle: '热门智能体'
};

async function fetchCatalog() {
  const [home, experts, agents] = await Promise.all([
    api<{
      banners: HomeBannerItem[];
      categories: string[];
      agents: HellomeAgentItem[];
      settings: HomeSettings;
    }>('/api/public/home'),
    api<FDEExpert[]>('/api/public/experts'),
    api<{ catalog: HellomeAgentItem[]; solutions: AgentSolution[] }>('/api/public/agents')
  ]);
  return { home, experts, agents };
}

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [source, setSourceState] = useState<DemoSource>(() => getDemoSource());

  const query = useQuery({
    queryKey: ['public-catalog'],
    queryFn: fetchCatalog,
    enabled: source === 'api',
    retry: 1
  });

  const setSource = (next: DemoSource) => {
    setDemoSource(next);
    setSourceState(next);
    if (next === 'api') query.refetch();
  };

  const value = useMemo<CatalogState>(() => {
    const live = source === 'api' && query.data;
    return {
      source,
      setSource,
      loading: source === 'api' && query.isFetching,
      error: source === 'api' ? (query.error as Error | undefined)?.message || null : null,
      banners: live ? query.data!.home.banners : defaultHomeBanners,
      categories: live ? query.data!.home.categories : defaultHomeCategories,
      homeAgents: live ? query.data!.home.agents : mockHellomeHomeAgents,
      experts: sortExpertsForPublic(live ? query.data!.experts : mockExperts),
      solutions: live ? query.data!.agents.solutions : mockAgentSolutions,
      settings: live ? query.data!.home.settings : defaultSettings,
      refresh: () => {
        if (source === 'api') query.refetch();
      }
    };
  }, [source, query.data, query.isFetching, query.error]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};
