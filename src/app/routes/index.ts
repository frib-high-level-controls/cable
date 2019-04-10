import * as express from 'express';

import { error } from '../shared/logging';

interface AuthConfig {
  cas: string;
}

let authConfig: AuthConfig;

export function setAuthConfig(config: AuthConfig) {
  authConfig = config;
}

export function main(req: express.Request, res: express.Response) {
  if (req.session && req.session.roles && req.session.roles.length) {
    return res.render('manager', {
      roles: req.session.roles,
    });
  }
  return res.render('main', {
    roles: req.session ? req.session.roles : [],
  });
}


export function switch2normal(req: express.Request, res: express.Response) {
  return res.render('main', {
    roles: req.session ? req.session.roles : [],
  });
}


// TODO implement the cas 2.0 logout

export function logout(req: express.Request, res: express.Response) {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        error(err);
      }
    });
  }
  res.redirect(authConfig.cas + '/logout');
}
