import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isJwtExpired } from "./lib/auth/jwt-expiry";
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
  callbacks: {
    async jwt({ token, account, profile }) {
      // Google 로그인 직후 ID Token을 백엔드로 전송
      if (account?.provider === "google" && account?.id_token && profile) {
        try {
          const response = await fetch(
            `${process.env.API_URL}/auth/google/verify`,
            {
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
            }
          );

          if (!response.ok) {
            throw new Error("백엔드 인증 실패");
          }

          const data: GoogleVerifyResponse = await response.json();

          // 백엔드 JWT를 토큰에 저장
          token.backendToken = data.token;
          token.backendUser = data.user;
        } catch (error) {
          console.error("백엔드 인증 오류:", error);
          // 오류 발생 시에도 NextAuth 세션은 유지하되, backendToken이 없으면 API 호출 불가
        }
      }

      // 백엔드 JWT가 만료되면 세션을 끝낸다 (갱신 API가 없어 다시 로그인해야 함)
      // null을 반환하면 세션이 없어져 각 페이지의 로그인 확인이 로그인 페이지로 보낸다
      if (token.backendToken && isJwtExpired(token.backendToken)) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      // session 반환값은 /api/auth/session으로 브라우저에 노출되므로 백엔드 토큰은 넣지 않는다
      // 토큰은 JWT 쿠키에만 두고 서버에서 getBackendToken()으로 읽는다
      if (token.backendToken) {
        session.backendUser = token.backendUser as GoogleVerifyResponse["user"];
      }

      return session;
    },
  },
});
