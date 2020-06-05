/**
 * Utilities for working with jQuery events
 */


/**
 * Execute the function and log either the thrown exception
 * or the value of the rejected promise.
 *
 * Note that 'Promise.resolve().then(f).catch(console.err)'
 * has similar behavior to this function (using less code),
 * however, the difference is it does NOT execute f() synchronously.
 */
export function catchAll(f: () => void | Promise<void>): void {
  // tslint:disable-next-line:no-console
  const error = console.error;
  try {
    Promise.resolve(f()).catch(error);
  } catch (err) {
    error(err);
  }
}

/**
 * Wraps catchAll() for use use as callback function (ie event handlers).
 *
 * To facitate better type checking customized functions have been
 * implemented for wrapping functions with up to 4 arguments.
 * (Is there a better way this could be implemented?)
 */
export function wrapCatchAll<A, B, C, D>(f: (a?: A, b?: B, c?: C, d?: D) => void | Promise<void>):
    (a?: A, b?: B, c?: C, d?: D) => void {
  return (a, b, c, d) => {
    catchAll(() => {
      f(a, b, c, d);
    });
  };
}

export function wrapCatchAll0(f: () => void | Promise<void>): () => void {
  return () => {
    catchAll(() => {
      f();
    });
  };
}

export function wrapCatchAll1<A>(f: (a: A) => void | Promise<void>): (a: A) => void {
  return (a) => {
    catchAll(() => {
      f(a);
    });
  };
}

export function wrapCatchAll2<A, B>(f: (a: A, b: B) => void | Promise<void>): (a: A, b: B) => void {
  return (a, b) => {
    catchAll(() => {
      f(a, b);
    });
  };
}

export function wrapCatchAll3<A, B, C>(f: (a: A, b: B, c: C) => void | Promise<void>): (a: A, b: B, c: C) => void {
  return (a, b, c) => {
    catchAll(() => {
      f(a, b, c);
    });
  };
}

export function wrapCatchAll4<A, B, C, D>(f: (a: A, b: B, c: C, d: D) => void | Promise<void>):
    (a: A, b: B, c: C, d: D) => void {
  return (a, b, c, d) => {
    catchAll(() => {
      f(a, b, c, d);
    });
  };
}

// Extract the main error message from a JQuery XHR request
export function unwrapPkgErrMsg(xhr: JQuery.jqXHR, msg?: string): string {
  const pkg = xhr.responseJSON;
  if (pkg && pkg.error && pkg.error.message) {
    return pkg.error.message;
  }
  if (msg) {
    return msg;
  }
  return xhr.statusText;
}
