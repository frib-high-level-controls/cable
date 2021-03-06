/* tslint:disable:no-console */
import * as express from 'express';

import { CableType } from '../model/meta';

import auth = require('../lib/auth');

import util = require('../lib/util');

import {
  catchAll,
  HttpStatus,
} from '../shared/handlers';

import * as XLSX from 'xlsx';

export function init(app: express.Application) {
  app.get('/cabletypes/', auth.ensureAuthenticated, (req, res) => {
    res.render('cabletype', {
      roles: req.session ? req.session.roles : [],
    });
  });

  app.get('/cabletypes/manage', auth.ensureAuthenticated, (req, res) => {
    if (req.session && req.session.roles.indexOf('admin') !== -1) {
      return res.render('cabletypemgmt');
    }
    return res.status(403).send('You are not authorized to access this resource');
  });

  app.get('/cabletypes/new', auth.ensureAuthenticated, (req, res) => {
    if (req.session && req.session.roles.indexOf('admin') !== -1) {
      return res.render('newcabletype');
    }
    return res.status(403).send('You are not authorized to access this resource');
  });

  app.get('/cabletypes/json', auth.ensureAuthenticated, (req, res) => {
    CableType.find((err, docs) => {
      if (err) {
        return res.status(500).send(err.message);
      }
      res.json(docs);
    });
  });

  app.get('/cabletypes/xlsx', catchAll(async (req, res) => {
    const cableTypes = await CableType.find().sort({ conductorNumber: 1, name: 1 });

    const data: unknown[][] = [
      [ 'FRIB Cable Types' ],
      [
        'Name', 'Service', 'Conductor number', 'Conductor size', 'Type', 'Pairing',
        'Shielding', 'Outer Diameter', 'Voltage Rating', 'Raceway', 'Tunnel/Hotcell',
        'Manufacturer', 'Part number', 'Other Requirements',
      ],
    ];

    for (const cableType of cableTypes) {
      data.push([
        cableType.name,
        cableType.service,
        cableType.conductorNumber,
        cableType.conductorSize,
        cableType.fribType,
        cableType.pairing,
        cableType.shielding,
        cableType.outerDiameter,
        cableType.voltageRating,
        cableType.raceway,
        cableType.tunnelHotcell ? 'true' : 'false',
        cableType.manufacturer,
        cableType.partNumber,
        cableType.otherRequirements,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { width: 30}, { width: 30}, { width: 20}, { width: 20},
      { width: 20}, { width: 20}, { width: 30}, { width: 20},
      { width: 20}, { width: 25}, { width: 20}, { width: 25},
      { width: 40}, { width: 50},
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'cabletypes');

    res.setHeader('Content-Disposition', 'attachment; filename="FRIB Cable types.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.status(HttpStatus.OK).send(XLSX.write(wb, {type: 'buffer', bookType: 'xlsx'}));
  }));

  // tslint:disable:max-line-length
  app.post('/cabletypes/', auth.ensureAuthenticated, util.filterBody(['conductorNumber', 'conductorSize', 'fribType', 'typeNumber', 'newName', 'service', 'pairing', 'shielding', 'outerDiameter', 'voltageRating', 'raceway', 'tunnelHotcell', 'otherRequirements', 'manufacturer', 'partNumber']), (req, res) => {
    if (!req.session || req.session.roles.length === 0 || req.session.roles.indexOf('admin') === -1) {
      return res.status(403).send('You are not authorized to access this resource. ');
    }

    if (!req.is('json')) {
      return res.status(415).send('json request expected.');
    }

    const newType = req.body;

    // generate the type name here
    // tslint:disable:max-line-length
    newType.name = newType.conductorNumber + 'C_' + newType.conductorSize + '_' + newType.fribType + '_' + newType.typeNumber;
    newType.createdBy = req.session.userid;
    newType.createdOn = Date.now();

    (new CableType(newType)).save((err, type) => {
      if (err) {
        console.dir(err);
        console.error(err.message || err.err);
        if (err.code && err.code === 11000) {
          return res.status(400).send('The type name ' + newType.name + ' was already used.');
        }
        return res.status(500).send(err.message || err.err);
      }
      const url = res.locals.basePath + '/cabletypes/' + type._id;
      res.set('Location', url);
      return res.status(201).send('A new cable type is created at <a href="' + url + '"">' + url + '</a>');
    });
  });

  app.get('/cabletypes/:id/', auth.ensureAuthenticated, (req, res) => {
    res.redirect(res.locals.basePath + '/cabletypes/' + req.params.id + '/details');
  });

  app.get('/cabletypes/:id/details', auth.ensureAuthenticated, (req, res) => {
    CableType.findById(req.params.id).lean().exec((err, type) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err.message);
      }
      if (type) {
        res.render('typedetails', {
          type: type,
        });
      } else {
        res.status(410).send('The type ' + req.params.id + ' is gone.');
      }
    });
  });

  app.put('/cabletypes/:id', auth.ensureAuthenticated, (req, res) => {
    if (!req.session || req.session.roles.length === 0 || req.session.roles.indexOf('admin') === -1) {
      return res.status(403).send('You are not authorized to access this resource. ');
    }
    const conditions: any = {
      _id: req.params.id,
    };
    if (req.body.original === null) {
      conditions[req.body.target] = {
        $in: [null, ''],
      };
    } else {
      conditions[req.body.target] = req.body.original;
    }
    const update: any = {};
    update[req.body.target] = req.body.update;
    update.updatedOn = Date.now();
    update.updatedBy = req.session.userid;
    CableType.findOneAndUpdate(conditions, update, {
      new: true,
    }, (err, type) => {
      // the err is not a mongoose error
      if (err) {
        if (err.errmsg) {
          console.dir(err.errmsg);
        }
        if (err.lastErrorObject && err.lastErrorObject.code === 11001) {
          return res.status(400).send(req.body.update + ' is already taken');
        }
        return res.status(500).send(err.message || err.errmsg);
      }
      if (type) {
        return res.sendStatus(204);
      }
      return res.status(410).send('cannot find type ' + req.params.id);
    });
  });
}
