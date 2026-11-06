import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './api';

const RESOURCE_KEY = ['resource'];

function invalidateFor(queryClient, resource) {
  queryClient.invalidateQueries({ queryKey: [...RESOURCE_KEY, resource] });
  queryClient.invalidateQueries({ queryKey: ['stats'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['revenue'] });
  queryClient.invalidateQueries({ queryKey: ['billing'] });
  queryClient.invalidateQueries({ queryKey: ['portal'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}

export function useResource(resource, params = {}, options = {}) {
  return useQuery({
    queryKey: [...RESOURCE_KEY, resource, params],
    queryFn: async () => {
      const response = await api.get(`/${resource}`, { params });
      return {
        items: response.data?.data || [],
        pagination: response.data?.pagination || null,
      };
    },
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useRecord(resource, id, options = {}) {
  return useQuery({
    queryKey: [...RESOURCE_KEY, resource, 'record', id],
    queryFn: async () => unwrap(await api.get(`/${resource}/${id}`)),
    enabled: Boolean(id),
    ...options,
  });
}

export function useOptions() {
  return useQuery({
    queryKey: ['meta', 'options'],
    queryFn: async () => unwrap(await api.get('/meta/options')),
    staleTime: 5 * 60 * 1000,
  });
}

export function useModuleStats() {
  return useQuery({
    queryKey: ['stats', 'modules'],
    queryFn: async () => unwrap(await api.get('/dashboard/module-stats')),
    staleTime: 60 * 1000,
  });
}

export function useDashboardSummary(range = '30d', options = {}) {
  return useQuery({
    queryKey: ['dashboard', 'summary', range],
    queryFn: async () => unwrap(await api.get('/dashboard/summary', { params: { range } })),
    ...options,
  });
}

export function useDashboardWidgets(range = '30d', options = {}) {
  return useQuery({
    queryKey: ['dashboard', 'widgets', range],
    queryFn: async () => unwrap(await api.get('/dashboard/widgets', { params: { range } })),
    ...options,
  });
}

export function useRevenueOverview(range = '30d') {
  return useQuery({
    queryKey: ['revenue', 'overview', range],
    queryFn: async () => unwrap(await api.get('/revenue/overview', { params: { range } })),
  });
}

export function useBillingOverview() {
  return useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: async () => unwrap(await api.get('/billing/overview')),
  });
}

export function useAiInsight(feature, payload = {}) {
  return useMutation({
    mutationFn: async (override = {}) => {
      const { url, method = 'post', data } = feature;
      const response = await api.request({
        url,
        method,
        data: method === 'get' ? undefined : { ...payload, ...override },
        params: method === 'get' ? { ...payload, ...override } : undefined,
      });
      return unwrap(response);
    },
  });
}

export function useUpload() {
  return useMutation({
    mutationFn: async ({ file, fields = {} }) => {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap(response);
    },
  });
}

export function useResourceActions(resource) {
  const queryClient = useQueryClient();
  const done = () => invalidateFor(queryClient, resource);

  const create = useMutation({
    mutationFn: async (payload) => unwrap(await api.post(`/${resource}`, payload)),
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...payload }) => unwrap(await api.put(`/${resource}/${id}`, payload)),
    onSuccess: done,
  });
  const remove = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/${resource}/${id}`)),
    onSuccess: done,
  });
  const bulkDelete = useMutation({
    mutationFn: async (ids) => unwrap(await api.post(`/${resource}/bulk-delete`, { ids })),
    onSuccess: done,
  });

  return { create, update, remove, bulkDelete };
}

export async function fetchAllRecords(resource, params = {}) {
  const response = await api.get(`/${resource}`, { params: { limit: 500, ...params } });
  return response.data?.data || [];
}
