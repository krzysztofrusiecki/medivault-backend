import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AccessTokenPayload } from "../types/jwt-payload.type";
import { Environment } from "@/config/schema";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService<Environment>) {
    const accessTokenSecret = configService.get<string>("ACCESS_TOKEN_SECRET");
    if (!accessTokenSecret) {
      throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessTokenSecret,
    });
  }

  validate(payload: AccessTokenPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
