export interface GoogleVerifyRequest {
  id_token: string;
  email: string;
  name: string;
  picture: string;
}

export interface GoogleVerifyResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    picture_url: string;
    created_at: string;
    updated_at: string;
  };
}
