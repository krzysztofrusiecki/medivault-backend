export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  familyId: string;
  iat?: number;
  exp?: number;
}
