import { DefaultSession } from "next-auth";
import { GoogleVerifyResponse } from "./auth";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
    backendUser?: GoogleVerifyResponse["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    backendUser?: GoogleVerifyResponse["user"];
  }
}
