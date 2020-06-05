/*
 * Shared Express request handlers.
 */
import * as fs from 'fs';
import * as util from 'util';

import * as express from 'express';
import * as formidable from 'formidable';

import {
  buildCheckFunction,
  buildSanitizeFunction,
  ErrorFormatter as VErrorFormatter,
  Location,
  Result as VResult,
  SanitizationChain,
  ValidationChain,
  ValidationError as VError,
  validationResult as vresult,
} from 'express-validator';

import * as HttpStatusCodes from 'http-status-codes';

import * as log from './logging';


type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;
type RequestHandler = express.RequestHandler;
type ErrorRequestHandler = express.ErrorRequestHandler;

type C = ValidationChain | SanitizationChain;

export {
  body as check,
  Location,
  SanitizationChain,
  sanitizeBody as sanitize,
  ValidationChain,
} from 'express-validator';

export const HttpStatus = HttpStatusCodes;

const exists = util.promisify(fs.exists);
const unlink = util.promisify(fs.unlink);

export interface HttpStatusError extends Error {
  status: number;
}

export type RequestPromiseHandler = (req: Request, res: Response, next: NextFunction) => PromiseLike<void>;

export function catchAll(handler: RequestPromiseHandler): RequestHandler {
  return (req, res, next) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Find the query parameter with the specified name using case-insensitive search.
 * By default the parameter is converted to a string. This can be disabled using the 'raw' option.
 */
export function findQueryParam(req: Request, name: string, caseSensitive: boolean, raw: true): any;
export function findQueryParam(req: Request, name: string, caseSensitive?: boolean, raw?: false): string | undefined;
export function findQueryParam(req: Request, name: string, caseSensitive?: boolean, raw?: boolean): any {
  function safeToString(obj: any): any {
    if (raw) {
      return obj;
    }
    if (obj !== undefined) {
      return String(obj);
    }
  }
  if (req.query.hasOwnProperty(name)) {
    return safeToString(req.query[name]);
  }
  if (!caseSensitive) {
    name = name.toUpperCase();
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        if (key.toUpperCase() === name) {
          return safeToString(req.query[key]);
        }
      }
    }
  }
}

/**
 * Wrap the Express format() method to support promises.
 * (For more details: http://expressjs.com/en/api.html#res.format)
 * In addition, this method provides more specific typings than the original.
 */
export function format(res: Response, cbs: { [key: string]: () => Promise<void> | void }): Promise<void> {

  return new Promise((resolve, reject) => {
    const wrapper = (cb: () => Promise<void> | void) => {
      return () => {
        try {
          Promise.resolve(cb()).then(resolve, reject);
        } catch (err) {
          reject(err);
        }
      };
    };

    const fcbs: { [key: string]: () => void } = {};
    for (const cb in cbs) {
      if (cbs.hasOwnProperty(cb)) {
        fcbs[cb] = wrapper(cbs[cb]);
      }
    }
    if (!fcbs.default) {
      fcbs.default = wrapper(() => {
        throw new RequestError(HttpStatus.NOT_ACCEPTABLE);
      });
    }
    res.format(fcbs);
  });
}

type RequestErrorDetails = webapi.PkgError;

const DEFAULT_ERROR_STATUS = HttpStatus.INTERNAL_SERVER_ERROR;
const DEFAULT_ERROR_MESSAGE = HttpStatus.getStatusText(DEFAULT_ERROR_STATUS);

export class RequestError extends Error implements HttpStatusError  {

  protected static getHttpStatusText(status: number): string {
    try {
      return HttpStatus.getStatusText(status);
    } catch (err) {
      return HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public status = DEFAULT_ERROR_STATUS;

  public details: RequestErrorDetails = {
    code: DEFAULT_ERROR_STATUS,
    message: DEFAULT_ERROR_MESSAGE,
  };

  constructor(msg?: string | number, details?: RequestErrorDetails)
  constructor(msg: string, status: number, details?: RequestErrorDetails);
  constructor(msg?: string | number, status?: number | RequestErrorDetails, details?: RequestErrorDetails) {
    super(DEFAULT_ERROR_MESSAGE);

    if (typeof msg === 'string') {
      this.message = msg;
      this.details.message = this.message;
    } else if (typeof msg === 'number') {
      this.status = msg;
      this.message = RequestError.getHttpStatusText(this.status);
      this.details.code = this.status;
      this.details.message = this.message;
      if (typeof status === 'object') {
        this.details = status;
      }
      return;
    }

    if (typeof status === 'number') {
      this.status = status;
      this.details.code = this.status;
    } else if (typeof status === 'object') {
      this.details = status;
      return;
    }

    if (typeof details === 'object') {
      this.details = details;
    }
  }
}

/**
 * Ensure the request contains a valid web API package.
 */
export function ensurePackage(allowError?: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || (!req.body.data || (allowError && !req.body.error))) {
      next(new RequestError('Request body not a valid data package', HttpStatus.BAD_REQUEST));
    }
    next();
  };
}

// export function ensureAccepts(type: string): RequestHandler;
export function ensureAccepts(type: string | string[]): RequestHandler;
export function ensureAccepts(...type: string[]): RequestHandler;
export function ensureAccepts(type: string | string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let accepts: string | false = false;
    if (Array.isArray(type)) {
      accepts = req.accepts(type);
    } else {
      accepts = req.accepts(type);
    }
    if (!accepts) {
      next(new RequestError(HttpStatus.getStatusText(HttpStatus.NOT_ACCEPTABLE), HttpStatus.NOT_ACCEPTABLE));
    }
    next();
  };
}

export function notFoundHandler(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const status = HttpStatus.NOT_FOUND;
    const message = HttpStatus.getStatusText(status);
    next(new RequestError(message, status));
  };
}

export function requestErrorHandler(): ErrorRequestHandler {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    let status = DEFAULT_ERROR_STATUS;
    let message = DEFAULT_ERROR_MESSAGE;
    let details: RequestErrorDetails = {
      code: status,
      message: message,
    };

    if (err instanceof RequestError) {
      message = err.message;
      status = err.status;
      details = err.details;
    } else if (err instanceof Error) {
      message = err.message;
      details.message = message;
      // If the error includes a 'status' property then use it.
      // (Specifically added to support passport's AuthenticationError)
      const s = Number((err as any).status);
      if (s >= 100 && s < 600) {
        status = Math.floor(s);
        details.code = status;
      }
    }

    if (status >= 500) {
      log.error(err);
    }

    format(res, {
      'text/html': () => {
        const env = req.app.get('env');
        const context = {
          code: details.code,
          message: details.message,
          errors: details.errors,
          cause: (env === 'development') ? err : undefined,
        };
        res.status(status).render('error', context);
      },
      'application/json': () => {
        const pkg: webapi.Pkg<undefined> = {
          data: undefined,
          error: details,
        };
        res.status(status).json(pkg);
      },
      'default': () => {
        res.status(status).send(details.message);
      },
    }).catch(next);
  };
}


/**
 * Noop request handler useful for initial values or placeholders.
 */
export function noopHandler(err?: any): RequestHandler {
  return (req, res, next) => {
    if (err) {
      next(err);
      return;
    }
    next();
  };
}


/**
 * Set the response local 'basePath' to relative
 * path of application base. Redirect GET requests
 * to remove trailing slash.
 */
export function basePathHandler(): RequestHandler {
  return (req, res, next) => {
    const basePaths: string[] = [ '.' ];

    const url = req.url.split('?');
    const segments = url[0].split('/');
    for (let idx = 0; idx < (segments.length - 2); idx += 1) {
      basePaths.push('..');
    }

    const basePath = basePaths.join('/');

    // Redirect to remove trailing slash (GET requests only)
    if ((req.method === 'GET') && (url[0] !== '/') && url[0].endsWith('/')) {
      url[0] = url[0].substr(0, url[0].length - 1);
      res.redirect(basePath + url.join('?'));
      return;
    }

    res.locals.basePath = basePath;
    next();
  };
}


/**
 * Process the given validation or sanitation chains for a request.
 */
export function validate(req: Request, chains: C[]): Promise<void> {
  let p = Promise.resolve();
  for (const chain of chains) {
    p = p.then(() => chain.run(req)).then((context) => undefined);
  }
  return p;
}

/**
 * Fomat a validation error as Package Error Detail.
 */
export const pkgErrorDetailFormatter: VErrorFormatter = (verror): webapi.PkgErrorDetail => {
  return {
    reason: 'ValidationError',
    location: verror.param,
    message: verror.msg,
  };
};

/**
 * Get the validation results from the request. If 'format' is true then convert the result
 * to a PkgErrorDetail object. A custom validation error formatter may also be provided.
 */

export function validationResult(req: Request, formatWith?: false): VResult<VError>;
export function validationResult(req: Request, formatWith: true): VResult<webapi.PkgErrorDetail>;
export function validationResult<T>(req: Request, formatWith: VErrorFormatter<T> ): VResult<T>;
export function validationResult<T>(req: Request, formatWith?: boolean | VErrorFormatter<T> ): VResult<VError | T> {
  const result = vresult(req);
  if (!formatWith) {
    return result;
  }
  if (formatWith === true) {
    return result.formatWith(pkgErrorDetailFormatter);
  }
  return result.formatWith(formatWith);
}

/**
 * Process the given validation or sanitation chains, and if the result
 * contains a validation error then prepare and throw a RequestError.
 */
export function validateAndThrow(req: Request, chains: C[]): Promise<void>;
export function validateAndThrow(req: Request, msg: string, chains: C[]): Promise<void>;
export function validateAndThrow(req: Request, msg: string, code: number, chains: C[]): Promise<void>;
export function validateAndThrow(req: Request, msg?: string | C[], code?: number | C[], chains?: C[]): Promise<void> {
  let vmsg = 'Request data validation error';
  let vcode = HttpStatus.BAD_REQUEST;
  if (Array.isArray(msg)) {
    chains = msg;
  } else if (msg) {
    vmsg = msg;
  }
  if (Array.isArray(code)) {
    chains = code;
  } else if (code) {
    vcode = code;
  }
  if (!Array.isArray(chains)) {
     return Promise.resolve();
  }
  return validate(req, chains).then(() => {
    const result = validationResult(req, true);
    if (!result.isEmpty()) {
      const perror: webapi.PkgError = {
        code: vcode,
        message: vmsg,
        errors: result.array(),
      };
      throw new RequestError(perror.message, perror.code, perror);
    }
  });
}

export type Validator<T = string> = (fields?: T | T[], msg?: string) => ValidationChain;

export type Sanitizer<T = string> = (fields?: T | T[]) => SanitizationChain;

/**
 *  Build a validator function for the specified locations.
 *  If none are provided then 'body' is the default location.
 */
export function buildValidator(locations: Location | Location[], prefix?: string): Validator {
  const locs = ([] as Location[]).concat(locations);
  if (locs.length === 0) {
    // provide default
    locs.push('body');
  }
  const check = buildCheckFunction(locs);
  if (prefix) {
    return (path: string, msg: string) => check(prefix + '.' + path, msg);
  }
  return check;
}

/**
 *  Build a sanitizer function for the specified locations.
 *  If none are provided then 'body' is the default location.
 */
export function buildSanitizer(locations: Location | Location[], prefix?: string): Sanitizer {
  const locs = ([] as Location[]).concat(locations);
  if (locs.length === 0) {
    // provide default
    locs.push('body');
  }
  const sanitize = buildSanitizeFunction(locs);
  if (prefix) {
    return (path: string) => sanitize(prefix + '.' + path);
  }
  return sanitize;
}

/**
 *  The typings definition does not provide an options definition, derived from source:
 *  https://github.com/node-formidable/formidable/blob/v1.2.1/lib/incoming_form.js#L26
 */
export interface ParseFormOptions {
  encoding?: string;
  uploadDir?: string;
  keepExtensions?: boolean;
  maxFileSize?: number;
  maxFieldsSize?: number;
  maxFields?: number;
  hash: boolean;
  // multiples: boolean; // Do not support for this wrapper function!
}

export interface FormFields {
  [key: string]: string | undefined;
}

export interface FormFiles {
  [key: string]: FormFile | undefined;
}

export type FormFile = formidable.File;

type ParseFormDataResult = Promise<{ fields: FormFields; files: FormFiles }>;

/**
 * Parse multipart form data from the provided request.
 */
export function parseFormData(req: Request, opts?: ParseFormOptions): ParseFormDataResult {
  // @types/formidable (v1.0.31) does not include a constructor with an options parameter!
  const form = new (formidable.IncomingForm as any)(opts);
  return new Promise((resolve, reject) => {
    form.parse(req, (err: any, fields: FormFields, files: FormFiles) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

/**
 * Convenience function to delete all files created by calls to parseFormData().
 */
export async function deleteFormFiles(files: FormFiles): Promise<void> {
  const ps: Array<Promise<void>> = [];
  for (const key of Object.keys(files)) {
    const file = files[key];
    if (file) {
      ps.push(Promise.resolve().then(() => {
        return exists(file.path);
      })
      .then((found) => {
        if (found) {
          return unlink(file.path);
        }
      }));
    }
  }
  // Simplifed using Promise.allSettled(),
  // but it is only available in Node v12.
  let e: any;
  for (const p of ps) {
    try {
      await p;
    } catch (err) {
      if (!e) {
        e = err;
      }
    }
  }
  if (e) {
    throw e;
  }
  return;
}
