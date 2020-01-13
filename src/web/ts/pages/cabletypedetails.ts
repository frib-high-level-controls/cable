/**
 * Cable Type details page
 */
import './base';

import * as $ from 'jquery';

import { json2List } from '../lib/util';


$(function(){
  $('#details').html(json2List((window as any).type));
});
