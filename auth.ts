import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
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
            `${process.env.NEXT_PUBLIC_API_URL}/auth/google/verify`,
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

      return token;
    },
    async session({ session, token }) {
      // 세션에 백엔드 정보 추가
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
        session.backendUser = token.backendUser as GoogleVerifyResponse["user"];
      }

      return session;
    },
  },
});
