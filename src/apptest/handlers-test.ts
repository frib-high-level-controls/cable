/**
 * Test the handlers utilities
 */

import * as bodyparser from 'body-parser';
import { assert } from 'chai';
import * as express from 'express';
import * as request from 'supertest';


import {
  catchAll,
  check,
  HttpStatus,
  sanitize,
  validateAndThrow,
} from '../app/shared/handlers';


describe('Validation Utilities', () => {

  const handler = express();

  handler.use(bodyparser.json());

  handler.post('/simple', catchAll(async (req, res) => {

    await validateAndThrow(req, [
      sanitize('height').toFloat(),
      check('name').isAlpha(),
      check('height').isNumeric(),
    ]);

    res.status(HttpStatus.OK).send(req.body);
  }));

  it('Simple Valid Data', async () => {
    return request(handler)
      .post('/simple')
      .set('Content-Type', 'application/json')
      .send({ name: 'Worf', height: 204 })
      .expect(200)
      .expect((res: request.Response) => {
        assert.isNumber(res.body.height);
      });
  });

  it('Simple Valid Data (with number as string)', async () => {
    return request(handler)
      .post('/simple')
      .set('Content-Type', 'application/json')
      .send({ name: 'Worf', height: '204' })
      .expect(200)
      .expect((res: request.Response) => {
        assert.isNumber(res.body.height);
      });
  });

  it('Simple Invalid Data', async () => {
    return request(handler)
      .post('/simple')
      .set('Content-Type', 'application/json')
      .send({ name: 1992, height: 'Crusher' })
      .expect(400);
  });

  it('Simple Invalid Data', async () => {
    return request(handler)
      .post('/simple')
      .set('Content-Type', 'application/json')
      .send({ name: 'Worf' })
      .expect(400);
  });
});
