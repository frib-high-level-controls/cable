/* tslint:disable:no-console */
import * as Debug from 'debug';
import * as express from 'express';

import * as auth from '../shared/auth';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

const debug = Debug('cable:auth');

let accessTokens: string[] = [];

export function setAccessTokens(tokens: string[]) {
  accessTokens = tokens;
}

// Authorize request using API token otherwise use standard method.
export function ensureAuthWithToken(req: Request, res: Response, next: NextFunction) {
  const tok = req.query.token;
  if (tok && Array.isArray(accessTokens)) {
    for (const token of accessTokens) {
      if (tok === token) {
        next();
        return;
      }
    }
  }
  ensureAuthenticated(req, res, next);
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  debug('Depicated: ensureAuthenticated() should be replaced with auth.ensureAuthc()');
  auth.ensureAuthenticated(req, res, next);
}

export function verifyRoles(roles: string[]): express.RequestHandler {
  debug('Depicated: verifyRoles() should be replaced with ensureHasAnyRole()');
  return auth.ensureHasAnyRole(roles);
}
