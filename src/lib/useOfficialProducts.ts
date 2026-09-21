import { api } from './api';
import {
  mergeOfficialProducts,
  type AgentCustomProject,
  type OfficialProductTemplate
} from '../../shared/customProjects';

export async function applyOfficialProductDefaults(
  current: AgentCustomProject[],
  omittedIds: string[] = []
) {
  try {
    const official = await api<OfficialProductTemplate[]>('/api/public/official-products');
    return mergeOfficialProducts(current, official, omittedIds);
  } catch {
    return current;
  }
}
