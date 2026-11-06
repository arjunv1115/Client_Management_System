import { useMemo } from 'react';
import { useOptions } from './hooks';

export const byId = (rows = []) => Object.fromEntries(rows.map((row) => [row.id, row]));

export const toOptions = (rows = [], labelKey = 'name') =>
  rows.map((row) => ({ value: row.id, label: row.label || row[labelKey] || row.name || row.id }));

/**
 * Shared metadata lookup used across modules. Keeps select options and
 * name resolution consistent without every page re-fetching /meta/options.
 */
export function useLookups() {
  const query = useOptions();
  const options = query.data || {};

  const maps = useMemo(() => ({
    clients: byId(options.clients),
    projects: byId(options.projects),
    team: byId(options.team),
    profiles: byId(options.profiles),
    leadStages: byId(options.leadStages),
    projectStages: byId(options.projectStages),
    taskColumns: byId(options.taskColumns),
    leadSources: byId(options.leadSources),
    expenseCategories: byId(options.expenseCategories),
    revenueCategories: byId(options.revenueCategories),
  }), [options]);

  const names = useMemo(() => ({
    client: (id) => maps.clients[id]?.label || maps.clients[id]?.name || '—',
    project: (id) => maps.projects[id]?.name || '—',
    person: (id) => maps.team[id]?.name || maps.profiles[id]?.name || '—',
    leadStage: (id) => maps.leadStages[id]?.name || '—',
  }), [maps]);

  return { options, maps, names, isLoading: query.isLoading, error: query.error };
}
