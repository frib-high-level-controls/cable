

declare module 'cas.js' {

  interface ClientOptions {
    base_url: string;
    service: string;
    version: number;
  }

  interface ValidateResult {
    validated: boolean;
    username: string;
  }

  type ValidateCallback = (err: any, response: Response, result: ValidateResult) => void;

  class Client {
    constructor(options: ClientOptions)

    public validate(ticket: string, cb: ValidateCallback): void;
  }

  export = Client;
}
