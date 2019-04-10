/* tslint:disable:no-console */
import * as url from 'url';

import * as Debug from 'debug';
import * as express from 'express';

// authentication and authorization functions
import Client = require('cas.js');

import * as ldapjs from './ldapjs-client';

import { User } from '../model/user';

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

interface ADConfig {
  searchFilter: string;
  objAttributes: string[];
  searchBase: string;
}

interface AuthConfig {
  cas: string;
  service: string;
  tokens: string[];
}

let ad: ADConfig;

export function setADConfig(config: ADConfig) {
  ad = config;
}

const debug = Debug('cable:auth');

let cas: Client;

let authConfig: AuthConfig;

export function setAuthConfig(config: AuthConfig) {
  authConfig = config;
  cas = new Client({
    base_url: authConfig.cas,
    service: authConfig.service,
    version: 1.0,
  });
}

let ldapClient: ldapjs.Client;

export function setLDAPClient(client: ldapjs.Client) {
  ldapClient = client;
}

// Authorize request using API token otherwise use standard method.
export function ensureAuthWithToken(req: Request, res: Response, next: NextFunction) {
  let len;
  let idx;
  const tok = req.query.token;
  if (tok && Array.isArray(authConfig.tokens)) {
    len = authConfig.tokens.length;
    for (idx = 0; idx < len; idx += 1) {
      if (tok === authConfig.tokens[idx]) {
        next();
        return;
      }
    }
  }
  ensureAuthenticated(req, res, next);
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  const ticketUrl = url.parse(req.url, true);
  if (req.session && req.session.userid) {
    if (req.query.ticket) {
      // remove the ticket query param
      delete ticketUrl.query.ticket;
      return res.redirect(301, url.format({
        pathname: ticketUrl.pathname,
        query: ticketUrl.query,
      }));
    }
    next();
  } else if (req.query.ticket) {
    // redirected by CAS
    // var halt = pause(req);
    cas.validate(req.query.ticket, (err, casresponse, result) => {
      if (!req.session) {
        res.status(500).send('session missing');
        return;
      }
      if (err) {
        console.error(err.message);
        return res.status(401).send(err.message);
      }
      if (result.validated) {
        const userid = result.username.toLowerCase();
        req.session.userid = userid;
        User.findOne({
          adid: userid,
        }).exec((err0, user) => {
          if (!req.session) {
            res.status(500).send('session missing');
            return;
          }
          if (err0) {
            console.error(err0);
            return res.status(500).send('internal error with db');
          }
          if (user) {
            req.session.roles = user.roles;
            req.session.username = user.name;
            user.lastVisitedOn = new Date();
            user.save((err1) => {
              if (err1) {
                console.error(err1.message);
              }
            });
            next();
            return;
          }
          // create a new user
          const searchFilter = ad.searchFilter.replace('_id', userid);
          const opts = {
            filter: searchFilter,
            attributes: ad.objAttributes,
            scope: 'sub',
          };
          ldapClient.legacySearch(ad.searchBase, opts, false, (err2, ldapResult) => {
            if (err2) {
              console.error(err2.name + ' : ' + err2.message);
              return res.status(500).send('something wrong with ad');
            }
            if (!ldapResult || ldapResult.length === 0) {
              console.warn('cannot find ' + userid);
              return res.status(500).send(userid + ' is not found!');
            }
            if (ldapResult.length > 1) {
              return res.status(500).send(userid + ' is not unique!');
            }

            const first = new User({
              adid: userid,
              name: ldapResult[0].displayName,
              email: ldapResult[0].mail,
              office: ldapResult[0].physicalDeliveryOfficeName,
              phone: ldapResult[0].telephoneNumber,
              mobile: ldapResult[0].mobile,
              roles: [],
              lastVisitedOn: Date.now(),
            });

            first.save((err3, newUser) => {
              if (!req.session) {
                res.status(500).send('session missing');
                return;
              }
              if (err3) {
                // cannot save this user
                console.error(err3);
                console.error(first.toJSON());
                return res.status(500).send('Cannot log in. Please contact the admin. Thanks.');
              }
              console.info('A new user logs in: ' + newUser);
              // halt.resume();
              req.session.roles = [];
              req.session.username = first.name;

              next();
              return;
            });
          });
        });
      } else {
        console.error('CAS reject this ticket: ' + req.query.ticket);
        return res.status(401).send('CAS reject this ticket.');
      }
    });
  } else if (req.xhr) {
    // if this is ajax call, then tell the browser about this without redirect
    res.set('WWW-Authenticate', 'CAS realm="' + url.format({
      protocol: 'http',
      hostname: ticketUrl.hostname,
    }) + '"');
    res.status(401).send('xhr cannot be authenticated');
  } else {
    if (req.session) {
      debug('Store landing page in session: %s', req.url);
      req.session.landing = req.url;
    }
    res.redirect(authConfig.cas + '/login?service=' + encodeURIComponent(authConfig.service));
  }

}

export function verifyRoles(roles: string[]): express.RequestHandler {
  return (req, res, next) => {
    if (roles.length === 0) {
      return next();
    }
    let i;
    if (req.session && req.session.roles) {
      for (i = 0; i < roles.length; i += 1) {
        if (req.session.roles.indexOf(roles[i]) > -1) {
          return next();
        }
      }
      res.status(403).send('You are not authorized to access this resource. ');
    } else {
      console.log('Cannot identify your roles.');
      res.status(500).send('something wrong with your session');
    }
  };
}
