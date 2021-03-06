/**
 * Start and configure the web application.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import * as util from 'util';

// Required syntax because the type declaration uses 'export = rc;'.
// (See: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/rc/index.d.ts)
import rc = require('rc');

import * as bodyparser from 'body-parser';
import * as express from 'express';
import * as session from 'express-session';
import * as mongoose from 'mongoose';
import * as morgan from 'morgan';
import fswatch from 'node-watch';
import * as favicon from 'serve-favicon';

import * as auth from './shared/auth';
import * as handlers from './shared/handlers';
import * as logging from './shared/logging';
import * as ppauth from './shared/passport-auth';
import * as promises from './shared/promises';
import * as status from './shared/status';
import * as tasks from './shared/tasks';

import * as legacyauth from './lib/auth';
import * as ldapauth from './lib/ldap-auth';
import * as ldapjs from './lib/ldapjs-client';

import * as request from './model/request';

import routes = require('./routes');
import * as about from './routes/about';

import * as cable from './routes/cable';
import * as cabletype from './routes/cabletype';
import * as numbering from './routes/numbering';
import * as profile from './routes/profile';
import * as requests from './routes/requests';
import * as room from './routes/room';
import * as user from './routes/user';
import * as wbs from './routes/wbs';

// package metadata
interface Package {
  name?: {};
  version?: {};
}

// application configuration
interface Config {
  // these properties are provided by the 'rc' library
  // and contain config file paths that have been read
  // (see https://www.npmjs.com/package/rc)
  rc?: boolean;
  config?: string;
  configs?: string[];
  app: {
    port: {};
    addr: {};
    trust_proxy: {};
    session_life: {};
    session_secret: {};
    web_env?: {};
  };
  mongo: {
    user?: {};
    pass?: {};
    host?: {};
    port: {};
    addr: {};
    db: {};
    options: {};
  };
  ad: {
    url?: {};
    adminDn?: {};
    adminPassword?: {};
    searchBase?: {};
    searchFilter?: {};
    nameFilter?: {};
    objAttributes?: {};
    rawAttributes?: {};
    reconnect: {};
    timeout: {};
    idleTimeout: {};
    connectTimeout: {};
    tlsOptions?: {};
  };
  cas: {
    cas_url?: {};
    service_url?: {},
    service_base_url?: {};
    version?: {};
  };
  forgapi: {
    url?: {};
    agentOptions?: {};
  };
  access_tokens: {};
  metadata: {
    syssubsystem_path?: {};
    penetration_path?: {};
    wbs_frib_path?: {};
    wbs_rea6_path?: {};
    rooms_frib_path?: {};
    rooms_nscl_path?: {};
    rooms_srf_path?: {};
    tray_sections_path?: {};
    projects_path?: {};
    shared_dir_path?: {};
  };
}

// application states (same as tasks.State, but avoids the dependency)
export type State = 'STARTING' | 'STARTED' | 'STOPPING' | 'STOPPED';

// application singleton
let app: express.Application;

// AD Client
let adClient: ldapjs.Client | null = null;

// application logging
export let info = logging.info;
export let warn = logging.warn;
export let error = logging.error;

// application lifecycle
const task = new tasks.StandardTask<express.Application>(doStart, doStop);

// application activity
const activeLimit = 100;
const activeResponses = new Set<express.Response>();
const activeSockets = new Set<net.Socket>();
let activeFinished = Promise.resolve();

const readFile = util.promisify(fs.readFile);

const statFile = util.promisify(fs.stat);

async function readJSON(filepath: unknown): Promise<any> {
  return JSON.parse(await readFile(String(filepath), 'utf8'));
}

const fileWatchers: fs.FSWatcher[] = [];

async function watchJSON(filepath: string, cb: (err: any, data: any) => void): Promise<void> {
  cb(null, await readJSON(filepath));
  fileWatchers.push(fswatch(filepath, (eventType, filename) => {
    if (eventType === 'update') {
      readJSON(filepath).then((d) => cb(null, d), (err) => cb(err, null));
    }
  }));
}

// read the application name and version
async function readNameVersion(): Promise<[string | undefined, string | undefined]> {
  // first look for application name and version in the environment
  let name = process.env.NODE_APP_NAME;
  let version = process.env.NODE_APP_VERSION;
  // second look for application name and verison in package.json
  if (!name || !version) {
    const pkgPath = path.resolve(__dirname, 'version.json');
    let pkg: Package | undefined;
    try {
      pkg = JSON.parse(await readFile(pkgPath, 'UTF-8'));
    } catch (err) {
      warn('Missing or invalid package metadata: %s: %s', pkgPath, err);
    }
    if (!name && pkg && pkg.name) {
      name = String(pkg.name);
    } else {
      name = String(name);
    }
    if (!version && pkg && pkg.version) {
      version = String(pkg.version);
    } else {
      version = String(version);
    }
  }
  return [name, version];
}

// get the application state
export function getState(): State {
  return task.getState();
}

// asynchronously start the application
export function start(): Promise<express.Application> {
  return task.start();
}

// asynchronously configure the application
async function doStart(): Promise<express.Application> {

  info('Application starting');

  app = express();

  const [name, version] = await readNameVersion();
  app.set('name', name);
  app.set('version', version);

  activeSockets.clear();
  activeResponses.clear();

  function updateActivityStatus(): void {
    if (activeResponses.size <= activeLimit) {
      status.setComponentOk('Activity', activeResponses.size + ' <= ' + activeLimit);
    } else {
      status.setComponentError('Activity', activeResponses.size + ' > ' + activeLimit);
    }
  }

  activeFinished = new Promise((resolve) => {
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (task.getState() !== 'STARTED') {
        res.status(503).end('Application ' + task.getState());
        return;
      }

      if (!activeResponses.has(res)) {
        activeResponses.add(res);
        updateActivityStatus();
        res.on('finish', () => {
          if (!activeResponses.delete(res)) {
            warn('Response is NOT active!');
          }
          updateActivityStatus();
          if (task.getState() === 'STOPPING' && activeResponses.size <= 0) {
            resolve();
          }
        });
      } else {
        warn('Response is ALREADY active!');
      }

      const socket = res.connection;
      if (!activeSockets.has(socket)) {
        activeSockets.add(socket);
        socket.on('close', () => {
          if (!activeSockets.delete(socket)) {
            warn('Socket is NOT active!');
          }
        });
      }

      next();
    });
  });

  const env: {} | undefined = app.get('env');
  info('Deployment environment: \'%s\'', env);

  const cfg: Config = {
    app: {
      port: '3000',
      addr: 'localhost',
      trust_proxy: false,
      session_life: 3600000,
      session_secret: crypto.randomBytes(50).toString('base64'),
    },
    mongo: {
      port: '27017',
      addr: 'localhost',
      db: 'webapp-dev',
      options: {
        // see http://mongoosejs.com/docs/connections.html
        useNewUrlParser: true,
      },
    },
    ad: {
      reconnect: true,
      timeout: 15 * 1000,
      idleTimeout: 10 * 1000,
      connectTimeout: 10 * 1000,
    },
    cas: {
      // no defaults
    },
    forgapi: {
      // no defaults
    },
    access_tokens: [
      // no tokens
    ],
    metadata: {
      // no defaults
    },
  };

  if (name && (typeof name === 'string')) {
    rc(name, cfg);
    if (cfg.configs) {
      for (const file of cfg.configs) {
        info('Load configuration: %s', file);
      }
    }
  }

  if (cfg.rc) {
    JSON.stringify(cfg, null, 2).split('\n').forEach((l) => info(l));
    throw new Error('Read configuration and stop');
  }

  // Configure the server bind address and port
  app.set('port', String(cfg.app.port));
  app.set('addr', String(cfg.app.addr));

  // Proxy configuration (https://expressjs.com/en/guide/behind-proxies.html)
  app.set('trust proxy', cfg.app.trust_proxy || false);

  // Status monitor start
  await status.monitor.start();
  info('Status monitor started');

  // configure Mongoose (MongoDB)
  let mongoUrl = 'mongodb://';
  if (cfg.mongo.user) {
    mongoUrl += encodeURIComponent(String(cfg.mongo.user));
    if (cfg.mongo.pass) {
      mongoUrl += ':' + encodeURIComponent(String(cfg.mongo.pass));
    }
    mongoUrl += '@';
  }
  if (!cfg.mongo.host) {
    cfg.mongo.host = `${cfg.mongo.addr}:${cfg.mongo.port}`;
  }
  mongoUrl +=  `${cfg.mongo.host}/${cfg.mongo.db}`;

  // Remove password from the MongoDB URL to avoid logging the password!
  info('Mongoose connection URL: %s', mongoUrl.replace(/\/\/(.*):(.*)@/, '//$1:<password>@'));

  if (mongoose.Promise !== global.Promise) {
    // Mongoose 5.x should use ES6 Promises by default!
    throw new Error('Mongoose is not using native ES6 Promises!');
  }

  status.setComponentError('MongoDB', 'Never Connected');
  info('Mongoose connection: Never Connected');

  // NOTE: Registering a listener for the 'error' event
  // suppresses error reporting from the connect() method.
  // Therefore call connect() BEFORE registering listeners!
  await mongoose.connect(mongoUrl, cfg.mongo.options);

  status.setComponentOk('MongoDB', 'Connected');
  info('Mongoose connection: Connected');

  mongoose.connection.on('connected', () => {
    status.setComponentOk('MongoDB', 'Connected');
    info('Mongoose connection: Connected');
  });

  mongoose.connection.on('disconnected', () => {
    status.setComponentError('MongoDB', 'Disconnected');
    warn('Mongoose connection: Disconnected');
  });

  mongoose.connection.on('timeout', () => {
    status.setComponentError('MongoDB', 'Timeout');
    info('Mongoose connection: Timeout');
  });

  mongoose.connection.on('reconnect', () => {
    status.setComponentOk('MongoDB', 'Reconnected');
    info('Mongoose connection: Reconnected');
  });

  mongoose.connection.on('close', () => {
    status.setComponentError('MongoDB', 'Closed');
    warn('Mongoose connection: Closed');
  });

  mongoose.connection.on('reconnectFailed', () => {
    status.setComponentError('MongoDB', 'Reconnect Failed (Restart Required)');
    error('Mongoose connection: Reconnect Failed');
    // Mongoose has stopped attempting to reconnect,
    // so initiate appliction shutdown with the
    // expectation that systemd will auto restart.
    error('Sending Shutdown signal: SIGINT');
    process.kill(process.pid, 'SIGINT');
  });

  mongoose.connection.on('error', (err) => {
    status.setComponentError('MongoDB', '%s', err);
    error('Mongoose connection error: %s', err);
  });

  // Need the FORG base URL available to views
  app.locals.forgurl = String(cfg.forgapi.url);

  // Authentication Configuration
  adClient = await ldapjs.Client.create({
    url: String(cfg.ad.url),
    bindDN: String(cfg.ad.adminDn),
    bindCredentials: String(cfg.ad.adminPassword),
    reconnect: Boolean(cfg.ad.reconnect),
    timeout: Number(cfg.ad.timeout),
    idleTimeout: Number(cfg.ad.idleTimeout),
    connectTimeout: Number(cfg.ad.connectTimeout),
    tlsOptions: cfg.ad.tlsOptions,
  });
  info('LDAP client connected: %s', cfg.ad.url);
  status.setComponentOk('LDAP Client', 'Connected');

  adClient.on('connect', () => {
    info('LDAP client reconnected: %s', cfg.ad.url);
    status.setComponentOk('LDAP Client', 'Reconnected');
  });

  adClient.on('idle', () => {
    info('LDAP client connection is idle');
  });

  adClient.on('close', () => {
    warn('LDAP client connection is closed');
  });

  adClient.on('error', (err) => {
    error('LDAP client connection: %s', err);
  });

  adClient.on('quietError', (err) => {
    status.setComponentError('LDAP Client', '%s', err);
  });

  legacyauth.setAccessTokens(Array.isArray(cfg.access_tokens) ? cfg.access_tokens.map(String) : []);

  if (env === 'production' || process.env.RUNCHECK_AUTHC_DISABLED !== 'true') {
    if (!cfg.cas.cas_url) {
      throw new Error('CAS base URL not configured');
    }
    info('CAS base URL: %s', cfg.cas.cas_url);

    if (!cfg.cas.service_base_url) {
      throw new Error('CAS service base URL not configured');
    }
    info('CAS service base URL: %s (service URL: %s)', cfg.cas.service_base_url, cfg.cas.service_url);

    auth.setProvider(new ldapauth.LdapCasProvider(adClient, {
      cas: {
        casUrl: String(cfg.cas.cas_url),
        casServiceBaseUrl: String(cfg.cas.service_base_url),
        casServiceUrl: cfg.cas.service_url ? String(cfg.cas.service_url) : undefined,
        casVersion: cfg.cas.version ? String(cfg.cas.version) : undefined,
      },
      ldap: {
        objAttributes: Array.isArray(cfg.ad.objAttributes) ? cfg.ad.objAttributes.map(String) : [],
        searchBase: String(cfg.ad.searchBase),
        searchFilter: String(cfg.ad.searchFilter),
      },
    }));
    info('CAS authentication provider enabled');
  } else {
    // Use this provider for local development that DISABLES authentication!
    auth.setProvider(new ldapauth.DevLdapBasicProvider(adClient, {
      basic: {},
      ldap: {
        objAttributes: Array.isArray(cfg.ad.objAttributes) ? cfg.ad.objAttributes.map(String) : [],
        searchBase: String(cfg.ad.searchBase),
        searchFilter: String(cfg.ad.searchFilter),
      },
    }));
    warn('Development authentication provider: Password verification DISABLED!');
  }

  // Read metadata from data files
  if (!cfg.metadata.syssubsystem_path) {
    throw new Error('System-Subsystem data file path is required');
  }
  await watchJSON(String(cfg.metadata.syssubsystem_path), (err, data) => {
    if (err) {
      warn('Error reading System-Subsystem data file after change: %s', err);
      return;
    }
    cable.setSysSubData(data);
    request.setSysSubData(data);
    requests.setSysSubData(data);
    numbering.setSysSubData(data);
    info('System-Subsytem data file read: %s', cfg.metadata.syssubsystem_path);
  });

  if (!cfg.metadata.penetration_path) {
    throw new Error('Penetration data file path is required');
  }
  await watchJSON(String(cfg.metadata.penetration_path), (err, data) => {
    if (err) {
      warn('Error reading penetration data file after change: %s', err);
      return;
    }
    numbering.setPenetrationData(data);
    info('Penetration data file read: %s', cfg.metadata.penetration_path);
  });

  let wbsFRIB = {};
  let wbsREA6 = {};

  if (!cfg.metadata.wbs_frib_path) {
    throw new Error('WBS (FRIB) data file path is required');
  }
  await watchJSON(String(cfg.metadata.wbs_frib_path), (err, data) => {
    if (err) {
      warn('Error reading WBS (FRIB) data file after change: %s', err);
      return;
    }
    wbsFRIB = data;
    wbs.setWBSConfig({ frib: wbsFRIB, rea6: wbsREA6 });
    info('WBS (FRIB) data file read: %s', cfg.metadata.wbs_frib_path);
  });

  if (!cfg.metadata.wbs_rea6_path) {
    throw new Error('WBS (REA6) data file path is required');
  }
  await watchJSON(String(cfg.metadata.wbs_rea6_path), (err, data) => {
    if (err) {
      warn('Error reading WBS (REA6) data file after change: %s', err);
      return;
    }
    wbsREA6 = data;
    wbs.setWBSConfig({ frib: wbsFRIB, rea6: wbsREA6 });
    info('WBS (REA6) data file read: %s', cfg.metadata.wbs_rea6_path);
  });

  let roomsFRIB = {};
  let roomsNSCL = {};
  let roomsSRF = {};

  if (!cfg.metadata.rooms_frib_path) {
    throw new Error('Rooms (FRIB) data file path is required');
  }
  await watchJSON(String(cfg.metadata.rooms_frib_path), (err, data) => {
    if (err) {
      warn('Error reading Rooms (FRIB) data file after change: %s', err);
      return;
    }
    roomsFRIB = data;
    room.setBuildingConfig({ frib: roomsFRIB, nscl: roomsNSCL, srf: roomsSRF });
    info('Rooms (FRIB) data file read: %s', cfg.metadata.rooms_frib_path);
  });

  if (!cfg.metadata.rooms_nscl_path) {
    throw new Error('Rooms (NSCL) data file path is required');
  }
  await watchJSON(String(cfg.metadata.rooms_nscl_path), (err, data) => {
    if (err) {
      warn('Error reading Rooms (NSCL) data file after change: %s', err);
      return;
    }
    roomsNSCL = data;
    room.setBuildingConfig({ frib: roomsFRIB, nscl: roomsNSCL, srf: roomsSRF });
    info('Rooms (NSCL) data file read: %s', cfg.metadata.rooms_nscl_path);
  });

  if (!cfg.metadata.rooms_srf_path) {
    throw new Error('Rooms (SRF) data file path is required');
  }
  await watchJSON(String(cfg.metadata.rooms_srf_path), (err, data) => {
    if (err) {
      warn('Error reading Rooms (SRF) data file after change: %s', err);
      return;
    }
    roomsSRF = data;
    room.setBuildingConfig({ frib: roomsFRIB, nscl: roomsNSCL, srf: roomsSRF });
    info('Rooms (SRF) data file read: %s', cfg.metadata.rooms_srf_path);
  });

  if (!cfg.metadata.projects_path) {
    throw new Error('Projects data file path is required');
  }
  await watchJSON(String(cfg.metadata.projects_path), (err, data) => {
    if (err) {
      warn('Error reading Projects data file after change: %s', err);
      return;
    }
    cable.setProjects(data);
    request.setProjects(data);
    requests.setProjects(data);
    info('Projects data file read: %s', cfg.metadata.projects_path);
  });

  if (!cfg.metadata.tray_sections_path) {
    throw new Error('Tray Sections data file path is required');
  }
  await watchJSON(String(cfg.metadata.tray_sections_path), (err, data) => {
    if (err) {
      warn('Error reading Tray Sections data file after change: %s', err);
      return;
    }
    cable.setTraySections(data);
    request.setTraySections(data);
    requests.setTraySections(data);
    info('Tray Sections data file read: %s', cfg.metadata.tray_sections_path);
  });

  if (!cfg.metadata.shared_dir_path) {
    throw new Error('Shared docs directory path is required');
  } else {
    let fstats: fs.Stats;
    try {
      fstats = await statFile(String(cfg.metadata.shared_dir_path));
    } catch (err) {
      throw new Error(`Shared docs directory path is not found: ${cfg.metadata.shared_dir_path}`);
    }
    if (!fstats.isDirectory()) {
      throw new Error(`Shared docs path is not a directory: ${cfg.metadata.shared_dir_path}`);
    }
  }

  // view engine configuration
  app.set('views', path.resolve(__dirname, '..', 'views'));
  app.set('view engine', 'pug');
  app.set('view cache', (env === 'production') ? true : false);

  // Configure 'webenv' property and add to response locals
  const webenv = cfg.app.web_env || process.env.WEB_ENV || 'development';
  app.set('webenv', webenv);
  app.use((req, res, next) => {
    res.locals.webenv = webenv;
    next();
  });

  // Session configuration
  app.use(session({
    store: new session.MemoryStore(),
    resave: false,
    saveUninitialized: false,
    secret: String(cfg.app.session_secret),
    cookie: {
      maxAge: Number(cfg.app.session_life),
    },
  }));

  // Authentication handlers (must follow session middleware)
  app.use(auth.getProvider().initialize());

  // Request logging configuration (must follow authc middleware)
  morgan.token('remote-user', (req) => {
    const username = auth.getUsername(req);
    return username || 'anonymous';
  });

  if (env === 'production') {
    app.use(morgan('short'));
  } else {
    app.use(morgan('dev'));
  }

  // favicon configuration
  app.use(favicon(path.resolve(__dirname, '..', 'public', 'favicon.ico')));

  // static file configuration
  app.use(express.static(path.resolve(__dirname, '..', 'public')));

  // shared additional static documents
  app.use('/shared', express.static(String(cfg.metadata.shared_dir_path)));

  // Redirect requests ending in '/' and set response locals 'basePath'
  app.use(handlers.basePathHandler());

  // body-parser configuration
  app.use(bodyparser.json());
  app.use(bodyparser.urlencoded({
    extended: false,
  }));

  app.get('/login', auth.getProvider().authenticate({ rememberParams: [ 'bounce' ]}), (req, res) => {
    if (req.query.bounce && typeof req.query.bounce === 'string') {
      res.redirect(req.query.bounce);
      return;
    }
    res.redirect(res.locals.basePath || '/');
  });

  app.get('/logout', (req, res) => {
    auth.getProvider().logout(req);
    const provider = auth.getProvider();
    if (provider instanceof ppauth.CasPassportAbstractProvider) {
      const redirectUrl = provider.getCasLogoutUrl(true);
      info('Redirect to CAS logout: %s', redirectUrl);
      res.redirect(redirectUrl);
      return;
    }
    res.redirect(res.locals.basePath || '/');
  });

  app.get('/about', about.index);
  app.get('/', legacyauth.ensureAuthenticated, routes.main);

  app.get('/main', legacyauth.ensureAuthenticated, routes.switch2normal);

  user.setADConfig({
    objAttributes: Array.isArray(cfg.ad.objAttributes) ? cfg.ad.objAttributes.map(String) : [],
    rawAttributes: Array.isArray(cfg.ad.rawAttributes) ? cfg.ad.rawAttributes.map(String) : [],
    nameFilter: String(cfg.ad.nameFilter),
    searchBase: String(cfg.ad.searchBase),
    searchFilter: String(cfg.ad.searchFilter),
  });
  user.setLDAPClient(adClient);
  user.init(app);

  wbs.init(app);

  room.init(app);

  app.use(requests.getRouter());

  cable.init(app);

  cabletype.init(app);

  profile.init(app);

  app.use(numbering.getRouter());

  app.use('/status', status.router);

  // no handler found for request (404)
  app.use(handlers.notFoundHandler());

  // error handlers
  app.use(handlers.requestErrorHandler());

  info('Application started');
  return app;
}

// asynchronously stop the application
export function stop(): Promise<void> {
  return task.stop();
}

// asynchronously disconnect the application
async function doStop(): Promise<void> {
  info('Application stopping');

  if (activeResponses.size > 0) {
    info('Wait for %s active response(s)', activeResponses.size);
    try {
      await Promise.race([activeFinished, promises.rejectTimeout(15000)]);
    } catch (err) {
      warn('Timeout: End %s active response(s)', activeResponses.size);
      for (const res of activeResponses) {
        res.end();
      }
    }
  }

  if (activeSockets.size > 0) {
    warn('Destroy %s active socket(s)', activeSockets.size);
    for (const soc of activeSockets) {
      soc.destroy();
    }
  }

  // Close all file watchers
  for (const w of fileWatchers) {
    w.close();
  }
  info('FS watchers closed: %s', fileWatchers.length);

  // Unbind AD Client
  if (adClient) {
    try {
      await adClient.unbind(100); // wait 100ms
    } catch (err) {
      warn('LDAP client connection unbind failure: %s', err);
    } finally {
      adClient.destroy(new Error('Application is stopping'));
      info('LDAP client connection destroyed');
    }
  }

  // disconnect Mongoose (MongoDB)
  try {
    await mongoose.disconnect();
    info('Mongoose disconnected');
  } catch (err) {
    warn('Mongoose disconnect failure: %s', err);
  }

  try {
    await status.monitor.stop();
    info('Status monitor stopped');
  } catch (err) {
    warn('Status monitor stop failure: %s', err);
  }

  info('Application stopped');
}
