import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAuthToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

export function signResetToken(payload) {
  return jwt.sign(payload, env.jwt.resetSecret, { expiresIn: env.jwt.resetExpiresIn });
}

export function verifyResetToken(token) {
  return jwt.verify(token, env.jwt.resetSecret);
}
