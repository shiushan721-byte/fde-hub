export type DemoSource = 'mock' | 'api';

const KEY = 'fde-hub-data-source';

export function getDemoSource(): DemoSource {
  try {
    return localStorage.getItem(KEY) === 'api' ? 'api' : 'mock';
  } catch {
    return 'mock';
  }
}

export function setDemoSource(source: DemoSource) {
  localStorage.setItem(KEY, source);
}
