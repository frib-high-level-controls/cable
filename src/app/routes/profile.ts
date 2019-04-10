/**
 * Profile routes
 */
import * as express from 'express';

import { error } from '../shared/logging';

import * as auth from '../lib/auth';

import { User } from '../model/user';


export function init(app: express.Application) {
  app.get('/profile', auth.ensureAuthenticated, (req: express.Request, res: express.Response) => {
    if (!req.session) {
      res.status(500).send('session missing');
      return;
    }
    // render the profile page
    User.findOne({
      adid: req.session.userid,
    }).lean().exec((err, user) => {
      if (err) {
        error(err);
        return res.status(500).send('something is wrong with the DB.');
      }
      return res.render('profile', {
        user: user,
      });
    });
  });

  // user update her/his profile. This is a little different from the admin update the user's roles.
  app.put('/profile', auth.ensureAuthenticated, (req, res) => {
    if (!req.session) {
      res.status(500).send('session missing');
      return;
    }
    if (!req.is('json')) {
      return res.status(415).json({
        error: 'json request expected.',
      });
    }
    User.findOneAndUpdate({
      adid: req.session.userid,
    }, {
      subscribe: req.body.subscribe,
    }).lean().exec((err, user) => {
      if (err) {
        error(err);
        return res.status(500).json({
          error: err.message,
        });
      }
      res.sendStatus(204);
    });
  });
}
