
/*
 * GET about page.
 */
import * as express from 'express';

export function index(req: express.Request, res: express.Response) {
  res.render('about', { username: req.session ? req.session.username : undefined });
}
