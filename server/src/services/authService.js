import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { env } from '../config/env.js';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export async function generateAccessToken(user) {
  return new jose.SignJWT({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
    permissions: user.permissions || []
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // generous 1d for smooth enterprise backoffice session
    .sign(accessSecret);
}

export async function generateRefreshToken(user) {
  return new jose.SignJWT({ sub: user._id.toString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
}

export async function verifyAccessToken(token) {
  const { payload } = await jose.jwtVerify(token, accessSecret);
  return payload;
}

export async function verifyRefreshToken(token) {
  const { payload } = await jose.jwtVerify(token, refreshSecret);
  return payload;
}
