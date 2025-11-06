/**
 * Site 리소스 관련 타입 정의
 * Orbithall 댓글 시스템에서 관리하는 사이트 정보
 */

/**
 * Site 객체
 * 댓글 서비스가 제공될 웹사이트 정보
 */
export interface Site {
  id: number;
  name: string;
  domain: string;
  apiKey: string;
  isActive: boolean;
  corsOrigins: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Site 생성 요청 데이터
 */
export interface SiteCreateInput {
  name: string;
  domain: string;
  corsOrigins: string[];
}

/**
 * Site 수정 요청 데이터
 * 모든 필드가 선택사항
 */
export interface SiteUpdateInput {
  name?: string;
  isActive?: boolean;
  corsOrigins?: string[];
}

/**
 * Site 목록 조회 응답
 */
export interface ListSitesResponse {
  sites: Site[];
}

/**
 * Site 통계 정보
 */
export interface SiteStats {
  postCount: number;
  commentCount: number;
  deletedCommentCount: number;
}

/**
 * Site의 Post 정보
 */
export interface SitePost {
  id: number;
  siteId: number;
  url: string;
  title?: string;
  activeCommentCount: number;
  deletedCommentCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Site Posts 목록 조회 응답
 */
export interface ListSitePostsResponse {
  posts: SitePost[];
}