/*global describe, it, before, beforeEach, after, afterEach */

var assert = require('assert'),
  should = require('should'),
  naming = require('../lib/naming');


describe('naming', function () {
  describe('#encode()', function () {
    it('should return a valid name code', function () {
      var code = naming.encode('PPS', 'Access Control', 'Low Level Signal');
      code.should.eql(['1', '0', 'F']);
    });
    it('should return a nonvalid name code', function () {
      var code = naming.encode('PPS', 'ODH', 'N/A');
      code.length.should.be.exactly(2);
    });
    it('should return a valid name code', function () {
      var code = naming.encode('Linac Segment', 'Magnets', 'Low Level Signal');
      code.should.eql(['3', '0', 'F']);
    });
    it('should return a nonvalid name code', function () {
      var code = naming.encode('Linac Segment', 'something', '');
      code.length.should.be.exactly(1);
    });
    it('should return a valid name code', function () {
      var code = naming.encode('Linac Segment', 'RF', 'RF Power');
      code.should.eql(['3', '8', 'B']);
    });

  });
});
