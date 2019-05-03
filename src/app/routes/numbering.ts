import * as express from 'express';

import {
  HttpStatus,
  RequestError,
} from '../shared/handlers';

let sysSub: any;

export function setSysSubData(data: any) {
  sysSub = data;
}

let penetration: any;

export function setPenetrationData(data: any) {
  penetration = data;
}

let router: express.Router | null = null;

export function getRouter(opts?: {}): express.Router {
  if (router) {
    return router;
  }

  router = express.Router();

  router.get('/numbering', (req, res) => {
    if (!sysSub) {
      throw new RequestError('System-Subsystem data not found', HttpStatus.NOT_FOUND);
    }
    res.render('numbering', { sysSub });
  });

  router.get('/penetration', (req, res) => {
    if (!penetration) {
      throw new RequestError('Penetration data not found', HttpStatus.NOT_FOUND);
    }
    res.json(penetration);
  });

  router.get('/sys-sub', (req, res) => {
    if (!sysSub) {
      throw new RequestError('System-Subsystem data not found', HttpStatus.NOT_FOUND);
    }
    res.json(sysSub);
  });

  return router;
}
