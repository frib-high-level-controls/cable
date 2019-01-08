/* tslint:disable:no-console */
const authConfig = require('../../config/auth.json');

export function main(req, res) {
  if (req.session.roles && req.session.roles.length) {
    return res.render('manager', {
      roles: req.session.roles,
    });
  }
  return res.render('main', {
    roles: req.session.roles,
  });
}


export function switch2normal(req, res) {
  return res.render('main', {
    roles: req.session.roles,
  });
}


//TODO implement the cas 2.0 logout

export function logout(req, res) {
  if (req.session) {
    req.session.destroy(function (err) {
      if (err) {
        console.error(err);
      }
    });
  }
  res.redirect(authConfig.cas + '/logout');
}