/**
 * Site 폼 Zod 검증 스키마
 */

import { z } from "zod";

/**
 * Site 생성 폼 스키마
 */
export const siteCreateSchema = z.object({
  name: z
    .string()
    .min(1, "사이트 이름을 입력해주세요")
    .max(100, "사이트 이름은 최대 100자까지 입력 가능합니다"),
  domain: z
    .string()
    .min(1, "도메인을 입력해주세요")
    .url("올바른 URL 형식을 입력해주세요"),
  corsOrigins: z
    .array(z.string().url("올바른 URL 형식을 입력해주세요"))
    .min(1, "최소 1개 이상의 CORS Origin을 입력해주세요"),
});

/**
 * Site 수정 폼 스키마
 */
export const siteUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "사이트 이름을 입력해주세요")
    .max(100, "사이트 이름은 최대 100자까지 입력 가능합니다")
    .optional(),
  isActive: z.boolean().optional(),
  corsOrigins: z
    .array(z.string().url("올바른 URL 형식을 입력해주세요"))
    .min(1, "최소 1개 이상의 CORS Origin을 입력해주세요")
    .optional(),
});

/**
 * 타입 추론
 */
export type SiteCreateFormData = z.infer<typeof siteCreateSchema>;
export type SiteUpdateFormData = z.infer<typeof siteUpdateSchema>;
