"use server";

/**
 * Site 리소스 Server Actions
 * 백엔드 /admin/sites 엔드포인트와 통신
 */

import { camelize, snakify } from "@/lib/utils/camelize";
import type {
  Site,
  SiteCreateInput,
  SiteUpdateInput,
  SiteStats,
  SitePost,
} from "@/types/site";
import type { ActionResult } from "@/types/action";
import { revalidatePath } from "next/cache";
import { fetchBackend, fetchBackendJson, toActionFailure } from "./client";

/**
 * 사용자가 소유한 모든 사이트 목록 조회
 */
export async function getSites(): Promise<Site[]> {
  const response = await fetchBackendJson<{ sites: unknown[] }>("/admin/sites");
  return camelize<Site[]>(response?.sites);
}

/**
 * 특정 사이트 상세 정보 조회
 */
export async function getSiteById(id: number): Promise<Site> {
  const response = await fetchBackendJson<unknown>(`/admin/sites/${id}`);
  return camelize<Site>(response);
}

/**
 * 새 사이트 생성 및 API Key 발급
 * 클라이언트에서 호출하므로 실패 사유를 결과로 반환
 */
export async function createSite(data: SiteCreateInput): Promise<ActionResult<Site>> {
  let response: unknown;
  try {
    response = await fetchBackendJson<unknown>("/admin/sites", {
      method: "POST",
      body: JSON.stringify(snakify(data)),
    });
  } catch (error) {
    return toActionFailure(error);
  }

  revalidatePath("/sites");

  return { ok: true, data: camelize<Site>(response) };
}

/**
 * 사이트 정보 수정 (소유자만 가능)
 * domain과 api_key는 수정 불가
 * 클라이언트에서 호출하므로 실패 사유를 결과로 반환
 */
export async function updateSite(
  id: number,
  data: SiteUpdateInput
): Promise<ActionResult<Site>> {
  let response: unknown;
  try {
    response = await fetchBackendJson<unknown>(`/admin/sites/${id}`, {
      method: "PUT",
      body: JSON.stringify(snakify(data)),
    });
  } catch (error) {
    return toActionFailure(error);
  }

  revalidatePath("/sites");
  revalidatePath(`/sites/${id}`);

  return { ok: true, data: camelize<Site>(response) };
}

/**
 * 사이트 삭제 (연관된 posts, comments도 cascade 삭제)
 * 클라이언트에서 호출하므로 실패 사유를 결과로 반환
 */
export async function deleteSite(id: number): Promise<ActionResult> {
  try {
    await fetchBackend(`/admin/sites/${id}`, { method: "DELETE" });
  } catch (error) {
    return toActionFailure(error);
  }

  revalidatePath("/sites");

  return { ok: true, data: undefined };
}

/**
 * 사이트 통계 정보 조회
 */
export async function getSiteStats(id: number): Promise<SiteStats> {
  const response = await fetchBackendJson<unknown>(`/admin/sites/${id}/stats`);
  return camelize<SiteStats>(response);
}

/**
 * 사이트의 게시글 목록 조회
 */
export async function getSitePosts(id: number): Promise<SitePost[]> {
  const response = await fetchBackendJson<unknown | null>(`/admin/sites/${id}/posts`);
  return camelize<SitePost[]>(response || []);
}
