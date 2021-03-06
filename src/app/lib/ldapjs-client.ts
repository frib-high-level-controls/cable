/**
 * Convenience wrapper around the ldapjs library (that also adds support for promises)
 */
import * as Debug from 'debug';
import * as ldap from 'ldapjs';

export interface BindResult {
  messageID: number;
  protocolOp: string;
  status: number;       // Reference: https://ldap.com/ldap-result-code-reference-core-ldapv3-result-codes/
  matchedDN: string;
  errorMessage: string;
  // referrals: ?[];      // What is the expected array type?
  // controls: ?[];       // What is the expected array type?
}

export interface SearchOptions extends ldap.SearchOptions {
  scope?: 'base' | 'one' | 'sub'; // Refine definition from string
  raw?: boolean;
  base: string;
}

export interface LegacySearchOptions extends ldap.SearchOptions {
  scope?: 'base' | 'one' | 'sub'; // Refine definition from string
  raw?: boolean;
}

export type SearchEntryRaw = ldap.SearchEntryRaw;

export type SearchEntryObject = ldap.SearchEntryObject;

export interface IClient {
  search<T extends SearchEntryObject = SearchEntryObject>(options: SearchOptions): Promise<T[]>;
  search<T extends SearchEntryRaw = SearchEntryRaw>(options: SearchOptions & { raw: true }): Promise<T[]>;
  bind(dn: string, password: string, checked: true): Promise<boolean>;
  bind(dn: string, password: string, checked?: false): Promise<BindResult>;
  unbind(): Promise<void>;
  destroy(err?: any): void;
}

// Client options from http://ldapjs.org/client.html
// -------------------------------------------------
//            url:	A valid LDAP URL (proto/host/port only)
//     socketPath:	Socket path if using AF_UNIX sockets
//            log:	Bunyan logger instance (Default: built-in instance)
//        timeout:	Milliseconds client should let operations live for before timing out (Default: Infinity)
// connectTimeout:	Milliseconds client should wait before timing out on TCP connections (Default: OS default)
//     tlsOptions:	Additional options passed to TLS connection layer when connecting via ldaps (See: TLS for NodeJS)
//    idleTimeout:	Milliseconds after last activity before client emits idle event
//       strictDN:	Force strict DN parsing for client methods (Default is true)
export type ClientOptions = ldap.ClientOptions;


// The client event are lacking documentation.
// This list compiled by searching the source code.
export type ClientEvents = string
    | 'connect'        // Connected successfully
    | 'connectError'   // Error while connecting (like wrong URL)
    | 'connectTimeout' // Not sure when this is emitted?
    | 'setupError'     // Error while during setup (like wrong password)
    | 'socketTimeout'  // Not sure when this is emitted?
    | 'idle'           // Connection is idle
    | 'close'          // Connection is closed
    | 'error';         // General errors (setupsErrors repeated here, connectErrors are NOT!!)


const debug = Debug('runcheck:ldapjs-client');


export class Client implements IClient {

  public static create(options: ClientOptions) {
    const client = ldap.createClient(options);
    return new Promise<Client>((resolve, reject) => {
      const onConnect = () => {
        client.removeListener('connectError', onError);
        client.removeListener('setupError', onError);
        client.removeListener('error', onError);
        resolve(new Client(client));
      };
      const onError = (err: unknown) => {
        reject(err);
      };
      client.once('connect', onConnect);
      // Error events are sometimes emitted multiple times,
      // therefore listen with on() instead of once().
      client.on('connectError', onError);
      client.on('setupError', onError);
      client.on('error', onError);
    })
    .catch((err) => {
      // The connection may be partially created,
      // ensure that all sockets are destroyed.
      client.destroy();
      throw err;
    });
  }

  public pendingErrorTimeout = 5000;
  private pendingError: boolean = false;
  private pendingErrorValue: Error | null = null;
  private pendingErrorTimer: NodeJS.Timer | null = null;

  private client: ldap.Client;

  private constructor(client: ldap.Client) {
    this.client = client;

    // The LDAP client can experience frequent connection timeouts,
    // and subsequent reconnects depending on the configuraiton of
    // the LDAP server. This client emits a "quietError" event which
    // attempts to suppress these expected "false" connection errors.
    this.client.on('connect', () => {
      if (this.pendingError) {
        if (this.pendingErrorTimer) {
          clearTimeout(this.pendingErrorTimer);
          this.pendingErrorTimer = null;
        }
        this.pendingErrorValue = null;
        this.pendingError = false;
      }
    });

    this.client.on('error', (err) => {
      if (this.pendingError) {
        if (this.pendingErrorTimer) {
          clearTimeout(this.pendingErrorTimer);
          this.pendingErrorTimer = null;
        }
        if (this.pendingErrorValue) {
          this.client.emit('quietError', this.pendingErrorValue);
          this.pendingErrorValue = null;
        }
        this.client.emit('quietError', err);
      } else {
        this.pendingError = true;
        this.pendingErrorValue = err;
        this.pendingErrorTimer = setTimeout(() => {
          this.client.emit('quietError', this.pendingErrorValue);
          this.pendingErrorValue = null;
        }, this.pendingErrorTimeout);
      }
    });
  }


  public search<T extends SearchEntryObject = SearchEntryObject>(options: SearchOptions): Promise<T[]>;
  public search<T extends SearchEntryRaw = SearchEntryRaw>(options: SearchOptions & { raw: true }): Promise<T[]>;
  public search(options: SearchOptions): Promise<Array<ldap.SearchEntryRaw | ldap.SearchEntryObject>> {
    return new Promise<Array<ldap.SearchEntryRaw | ldap.SearchEntryObject>>((resolve, reject) => {
      const base = options.base;
      const raw = options.raw;



      const opts: ldap.SearchOptions = {
        derefAliases: options.derefAliases,
        paged: options.paged,
        sizeLimit: options.sizeLimit,
        timeLimit: options.timeLimit,
        typesOnly: options.typesOnly,
        filter: options.filter,
        attributes: options.attributes,
        scope: options.scope || 'sub',
      };


      this.client.search(base, opts, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        const items: Array<ldap.SearchEntryRaw | ldap.SearchEntryObject> = [];
        stream.on('searchEntry', (entry) => {
          if (raw) {
            items.push(entry.raw);
          } else {
            items.push(entry.object);
          }
        });
        stream.on('error', (rerr) => {
          reject(rerr);
        });
        stream.on('end', (result) => {
          if (!result || result.status !== 0) {
            reject(new Error(`LDAP search returns non-zero status: ${result ? result.status : 'null'}`));
            return;
          }
          resolve(items);
        });
      });
    });
  }

  /**
   * The standard bind() method throws an exception for invalid credentials,
   * in addition this method may throw exceptions for other error conditions.
   * If 'checked' argument is true, then check that the exception is for
   * invalid credentials and return false.
   */
  public bind(dn: string, password: string, checked: true): Promise<boolean>;
  public bind(dn: string, password: string, checked?: false): Promise<BindResult>;
  public bind(dn: string, password: string, checked?: boolean): Promise<BindResult | boolean> {
    return new Promise<BindResult | boolean>((resolve, reject) => {
      this.client.bind(dn, password, (err, result: BindResult) => {
        if (err) {
          debug('LDAP bind error: %s (%s): %s', err.name, err.code, err.message);
          if (!checked || err.name !== 'InvalidCredentialsError') {
            reject(err);
          } else {
            resolve(false);
          }
          return;
        }
        debug('LDAP bind result: %s (%s): %s', result.protocolOp, result.status, result.errorMessage || '<EMPTY>');
        if (!checked) {
          resolve(result);
          return;
        }
        resolve(result.status === 0);
      });
    });
  }

  // The 'unbind' command does not have a response, as such the result
  // is a TimeoutError unless another error occurs before the timeout.
  // (As documented in the type definition [@types/ldapjs])
  public unbind(waitForError?: number): Promise<void> {
    const p = [
      new Promise<void>((resolve, reject) => {
        this.client.unbind((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      }),
    ];

    if (waitForError !== undefined) {
      p.push(new Promise<void>((resolve) => {
        setTimeout(() => resolve(), waitForError);
      }));
    }

    return Promise.race(p);
  }

  public destroy(err?: any): void {
    this.client.destroy(err);
  }

  public on(event: ClientEvents, listener: (...args: any[]) => void): Client {
    this.client.on(event, listener);
    return this;
  }

  public once(event: ClientEvents, listener: (...args: any[]) => void): Client {
    this.client.once(event, listener);
    return this;
  }

  public addListener(event: ClientEvents, listener: (...args: any[]) => void): Client {
    this.client.addListener(event, listener);
    return this;
  }

  public removeListener(event: ClientEvents, listener: (...args: any[]) => void): Client {
    this.client.removeListener(event, listener);
    return this;
  }

  // Maintained to support legacy callback-based code! //
  public legacySearch(base: string, opts: LegacySearchOptions, raw: boolean, cb: (err: any, entry?: any[]) => void) {
    this.client.search(base, opts, (err, result) => {
      if (err) {
        debug(JSON.stringify(err));
        return cb(err);
      }
      const items: any[] = [];
      result.on('searchEntry', (entry) => {
        if (raw) {
          items.push(entry.raw);
        } else {
          items.push(entry.object);
        }
      });
      result.on('error', (err0) => {
        debug(JSON.stringify(err0));
        return cb(err0);
      });
      result.on('end', (result0) => {
        if (!result0 || result0.status !== 0) {
          const err0 = 'non-zero status from LDAP search: ' + (result0 ? result0.status : 'null');
          debug(JSON.stringify(err0));
          return cb(err0);
        }
        switch (items.length) {
        case 0:
          return cb(null, []);
        default:
          return cb(null, items);
        }
      });
    });
  }
}
