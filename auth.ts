import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { revokeBackendSession, toSessionTokens } from "./lib/auth/backend-tokens";
import { SESSION_MAX_AGE_SECONDS } from "./lib/auth/session-cookie";
import type { GoogleVerifyResponse } from "./types/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Google 로그인 직후 ID Token으로 백엔드 로그인해 토큰 쌍을 받는다
      if (account?.provider === "google" && account?.id_token && profile) {
        try {
          const response = await fetch(`${process.env.API_URL}/auth/google/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id_token: account.id_token,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            }),
          });

          if (!response.ok) {
            throw new Error(`백엔드 인증 실패: ${response.status}`);
          }

          const data: GoogleVerifyResponse = await response.json();

          return { ...token, ...toSessionTokens(data), backendUser: data.user };
        } catch (error) {
          console.error("백엔드 인증 오류:", error);
          // 오류 발생 시에도 NextAuth 세션은 유지하되, 백엔드 토큰이 없으면 API 호출 불가
          return token;
        }
      }

      // 백엔드 로그인은 됐는데 Refresh Token이 없으면(토큰 갱신 도입 전 세션) 다시 로그인해야 한다
      if (token.backendUser && !token.backendRefreshToken) {
        return null;
      }

      // Refresh Token이 만료되면 갱신할 수 없으므로 세션을 끝낸다
      // Access Token 갱신은 쿠키를 쓸 수 있는 proxy가 맡는다 (서버 컴포넌트에서는 새 토큰을 저장할 수 없음)
      if (
        token.backendRefreshTokenExpiresAt !== undefined &&
        Date.now() >= token.backendRefreshTokenExpiresAt
      ) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      // session 반환값은 /api/auth/session으로 브라우저에 노출되므로 백엔드 토큰은 넣지 않는다
      // 토큰은 JWT 쿠키에만 두고 서버에서 getBackendAccessToken()으로 읽는다
      if (token.backendAccessToken) {
        session.backendUser = token.backendUser;
      }

      return session;
    },
  },
  events: {
    // 로그아웃하면 백엔드 세션(Refresh Token 계열)도 폐기한다. 실패해도 로컬 세션은 삭제된다
    async signOut(message) {
      if ("token" in message && message.token?.backendRefreshToken) {
        await revokeBackendSession(message.token.backendRefreshToken);
      }
    },
  },
});
