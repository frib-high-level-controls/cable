/**
 * Route handlers for Cable Requests
 */
import * as Debug from 'debug';
import * as express from 'express';

import * as auth from '../shared/auth';

import {
  catchAll,
  HttpStatus,
} from '../shared/handlers';

const SERVER_ERROR = HttpStatus.INTERNAL_SERVER_ERROR;

const debug = Debug('cable:routes:requests');

const router = express.Router();

export function getRouter(opts?: {}) {
  return router;
}

router.get('/requests/import', auth.ensureAuthc(), (req, res) => {
  res.render('request-import');
});

router.post('/requests/import', auth.ensureAuthc(), catchAll(async (req, res) => {
  debug('import requests');
  res.status(SERVER_ERROR).send('not implemented');
}));
