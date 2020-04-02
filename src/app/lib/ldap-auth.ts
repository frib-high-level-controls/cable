/**
 * Support for LDAP authentication via shared Provider library
 */
import * as Debug from 'debug';
import * as express from 'express';
import * as passport from 'passport';

import * as auth from '../shared/auth';
import * as log from '../shared/logging';
import * as ppauth from '../shared/passport-auth';

import * as ldapjs from './ldapjs-client';

import { User } from '../model/user';

export interface LdapProviderOptions {
  searchFilter: string;
  objAttributes: string[];
  searchBase: string;
}

export interface LdapCasProviderOptions {
  cas: ppauth.CasProviderOptions;
  ldap: LdapProviderOptions;
}

export interface DevLdapBasicProviderOptions {
  basic: ppauth.BasicProviderOptions;
  ldap: LdapProviderOptions;
}

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

const debug = Debug('cable:ldap-auth');


function getUsername(provider: auth.IProvider, req: Request): string | undefined {
  const user = provider.getUser(req);
  if (!user) {
    return;
  }
  return user.uid ? String(user.uid) : undefined;
}

function getRoles(provider: auth.IProvider, req: Request): string[] | undefined {
  const user = provider.getUser(req);
  if (!user) {
    return;
  }
  return Array.isArray(user.roles) ? user.roles.map(String) : undefined;
}

// tslint:disable:max-line-length
function verifyWithLdap(ldapClient: ldapjs.IClient, ldapOptions: LdapProviderOptions, uid: string, done: ppauth.VerifyCallback) {
  Promise.resolve().then(async (): Promise<auth.IUser> => {
    let user = await User.findOne({ adid: uid }).exec();
    if (user) {
      debug('User found with uid: %s', uid);
      user.lastVisitedOn = new Date();
      await user.save();
      // Make user look like an FORG user
      const exists: auth.IUser = {
        uid: uid,
        fullname: user.name || uid,
        roles: user.roles || [],
      };
      return exists;
    }

    // Create a new user based on LDAP
    const searchFilter = ldapOptions.searchFilter.replace('_id', uid);
    const opts: ldapjs.SearchOptions = {
      base: ldapOptions.searchBase,
      filter: searchFilter,
      attributes: ldapOptions.objAttributes,
      scope: 'sub',
    };
    const result = await ldapClient.search(opts);
    if (!result || result.length === 0) {
      throw new Error(`User not found: ${uid}`);
    }
    if (result.length > 1) {
      throw new Error(`User not unique: ${uid}`);
    }

    debug('User created with uid: %s', uid);
    user = new User({
      adid: uid,
      name: result[0].displayName,
      email: result[0].mail,
      office: result[0].physicalDeliveryOfficeName,
      phone: result[0].telephoneNumber,
      mobile: result[0].mobile,
      roles: [],
      lastVisitedOn: Date.now(),
    });
    await user.save();
    // Make user look like an FORG user
    const iuser = {
      uid: uid,
      fullname: user.name || uid,
      roles: user.roles || [],
    };
    return iuser;
  })
  .then((user) => {
    done(null, user);
  })
  .catch((err) => {
    done(err);
  });
}

// Add userid, username and roles to session to support legacy code.
function locals(handler: express.RequestHandler): express.RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: any) => {
      const provider = auth.getProvider();
      const uid = provider.getUsername(req);
      if (uid && req.session) {
        req.session.userid = uid;
        req.session.username = provider.getUser(req)?.fullname || uid;
        req.session.roles = provider.getRoles(req) || [];
      }
      next(err);
    });
  };
}


export class LdapCasProvider extends ppauth.CasPassportAbstractProvider<ppauth.CasAuthenticateOptions> {

  protected ldapClient: ldapjs.IClient;
  protected ldapOptions: LdapProviderOptions;

  constructor(ldapClient: ldapjs.IClient, options: LdapCasProviderOptions) {
    super(options.cas);
    this.ldapClient = ldapClient;
    this.ldapOptions = { // copy options //
      searchBase: options.ldap.searchBase,
      searchFilter: options.ldap.searchFilter,
      objAttributes: options.ldap.objAttributes,
    };
  }

  public getUsername(req: Request): string | undefined {
    return getUsername(this, req);
  }

  public getRoles(req: Request): string[] | undefined {
    return getRoles(this, req);
  }

  protected locals(): express.RequestHandler {
    return locals(super.locals());
  }

  protected verify(profile: string | ppauth.CasProfile, done: ppauth.VerifyCallback) {
    let uid: string;
    if (typeof profile === 'string') {
      uid = profile.toLowerCase();
    } else {
      uid = profile.user.toLowerCase();
    }
    verifyWithLdap(this.ldapClient, this.ldapOptions, uid, done);
  }
}

export class DevLdapBasicProvider extends ppauth.BasicPassportAbstractProvider<passport.AuthenticateOptions> {

  protected ldapClient: ldapjs.IClient;
  protected ldapOptions: LdapProviderOptions;

  constructor(ldapClient: ldapjs.IClient, options: DevLdapBasicProviderOptions) {
    super(options.basic);
    this.ldapClient = ldapClient;
    this.ldapOptions = { // copy options //
      searchBase: options.ldap.searchBase,
      searchFilter: options.ldap.searchFilter,
      objAttributes: options.ldap.objAttributes,
    };
  }

  public getUsername(req: Request): string | undefined {
    return getUsername(this, req);
  }

  public getRoles(req: Request): string[] | undefined {
    return getRoles(this, req);
  }

  protected locals(): express.RequestHandler {
    return locals(super.locals());
  }

  protected verify(username: string, password: string, done: ppauth.VerifyCallback) {
    const env = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : undefined;
    if (env === 'production') {
      log.warn('Development Auth Provider DISABLED: PRODUCTION ENVIRONMENT DETECTED');
      done(null, false);
      return;
    }
    log.warn('Development Auth Provider ENABLED: PASSWORD VERIFICATION DISABLED');

    verifyWithLdap(this.ldapClient, this.ldapOptions, username, done);
  }
}
