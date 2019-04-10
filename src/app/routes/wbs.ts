import path = require('path');

import * as express from 'express';

interface WBSConfig {
  [key: string]: any;
  frib: any;
  rea6: any;
}

let wbs: WBSConfig;

export function setWBSConfig(config: WBSConfig) {
  wbs = config;
}

export function init(app: express.Application) {
  app.get('/:project/wbs', (req, res) => {
    res.render('wbs', {project: req.params.project, json: path.join(res.locals.basePath, req.path, '/json')});
  });

  app.get('/:project/wbs/json', (req, res) => {
    res.json(wbs[req.params.project]);
  });

  app.get('/:project/wbs/:number', (req, res) => {
    const parts: string[] = req.params.number.split('.');
    let key = parts[0];
    let locator = findChild(wbs[req.params.project], key);
    if (locator === null) {
       return res.json(null);
    }

    for (let i = 1; i < parts.length; i += 1) {
      key = key + '.' + parts[i];
      locator = findChild(locator, key);
      if (locator === null) {
         return res.json(null);
      }
    }
    res.json(locator);
  });
}

function findChild(object: any, childNumber: string) {
  for (const child of object.children) {
    if (child.number === childNumber) {
      return child;
    }
  }
  return null;
}
