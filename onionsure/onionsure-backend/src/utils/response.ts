/**
 * Standardised API response envelope (spec §35 / §44).
 *
 * Success: { success: true,  data }
 * Error:   { success: false, error: { code, message, details } }
 *
 * Controllers never write raw JSON — they call these helpers so every endpoint
 * in the platform shares one predictable contract.
 */
import type { Response } from 'express';

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** 200 OK */
export function ok<T>(res: Response, data: T): Response<SuccessEnvelope<T>> {
  return res.status(200).json({ success: true, data });
}

/** 201 CREATED */
export function created<T>(res: Response, data: T): Response<SuccessEnvelope<T>> {
  return res.status(201).json({ success: true, data });
}

/** 202 ACCEPTED — used for asynchronous AI processing (spec §37). */
export function accepted<T>(res: Response, data: T): Response<SuccessEnvelope<T>> {
  return res.status(202).json({ success: true, data });
}

/** 204 NO CONTENT */
export function noContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * List endpoints — wraps rows with the pagination block required by spec §8.
 */
export function paginated<T>(
  res: Response,
  data: T[],
  pagination: Pagination,
): Response<SuccessEnvelope<{ data: T[]; pagination: Pagination }>> {
  return res.status(200).json({ success: true, data: { data, pagination } });
}

/**
 * Build a pagination descriptor from a total count and the requested
 * page/pageSize. Clamps nonsense input rather than erroring.
 */
export function buildPagination(total: number, page: number, pageSize: number): Pagination {
  const safePageSize = Math.max(1, Math.min(200, Math.floor(pageSize) || 20));
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.max(1, Math.min(totalPages, Math.floor(page) || 1));
  return { page: safePage, pageSize: safePageSize, total, totalPages };
}
