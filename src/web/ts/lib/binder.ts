// import { parse } from "path";

// Copyright 2008 Steven Bazyl
// Copyright 2013 Dong Liu
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

// The original project is hosted at https://code.google.com/p/js-binding/

// tslint:disable:member-ordering
class Binder {
  public static Util = class {
    public static isFunction(obj: any): boolean {
      return obj != undefined && typeof(obj) == "function" && typeof(obj.constructor) == "function" && obj.constructor.prototype.hasOwnProperty("call");
    }
    public static isArray(obj: any): boolean {
      return obj != undefined && (obj instanceof Array || obj.construtor == "Array");
    }
    public static isString(obj: any): boolean {
      return typeof(obj) == "string" || obj instanceof String;
    }
    public static isNumber(obj: any): boolean {
      return typeof(obj) == "number" || obj instanceof Number;
    }
    public static isBoolean(obj: any): boolean {
      return typeof(obj) == "boolean" || obj instanceof Boolean;
    }
    public static isDate(obj: any): boolean {
      return obj instanceof Date;
    }
    public static isBasicType(obj: any): boolean {
      return this.isString(obj) || this.isNumber(obj) || this.isBoolean(obj) || this.isDate(obj);
    }
    public static isNumeric(obj: any): boolean {
      return this.isNumber(obj) || (this.isString(obj) && !isNaN(Number(obj)));
    }
    public static filter<T>(array: T[], callback: (v: T) => boolean) {
      const nv = [];
      for (let i = 0; i < array.length; i++) {
        if (callback(array[i])) {
          nv.push(array[i]);
        }
      }
      return nv;
    }
  };

  public static PropertyAccessor = class {

    public target: any;
    private index_regexp: RegExp;

    public static bindTo(obj: any) {
      return new Binder.PropertyAccessor(obj);
    }

    constructor(obj: any) {
      this.target = obj || {};
      this.index_regexp = /(.*)\[(.*?)\]/;
    }

    public _setProperty(obj: any, path, value) {
      if (path.length == 0 || obj == undefined) {
        return value;
      }
      var current = path.shift();
      if (current.indexOf("[") >= 0) {
        var match = current.match(this.index_regexp);
        var index = match[2];
        current = match[1];
        obj[current] = obj[current] || (Binder.Util.isNumeric(index) ? [] : {});
        if (index) {
          obj[current][index] = this._setProperty(obj[current][index] || {}, path, value);
        } else {
          var nv = this._setProperty({}, path, value);
          if (Binder.Util.isArray(nv)) {
            obj[current] = nv;
          } else {
            obj[current].push(nv);
          }
        }
      } else {
        obj[current] = this._setProperty(obj[current] || {}, path, value);
      }
      return obj;
    }
    public _getProperty(obj: any, path: string[]) {
      if (path.length == 0 || obj == undefined) {
        return obj;
      }
      var current = path.shift();
      if (current.indexOf("[") >= 0) {
        var match = current.match(this.index_regexp);
        current = match[1];
        if (match[2]) {
          return this._getProperty(obj[current][match[2]], path);
        } else {
          return obj[current];
        }
      } else {
        return this._getProperty(obj[current], path);
      }
    }
    public _enumerate(collection: any, obj: any, path: string) {
      if (Binder.Util.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
          this._enumerate(collection, obj[i], path + "[" + i + "]");
        }
      } else if (Binder.Util.isBasicType(obj)) {
        collection.push(path);
      } else {
        for (var property in obj) {
          if (!Binder.Util.isFunction(property)) {
            this._enumerate(collection, obj[property], path == "" ? property : path + "." + property);
          }
        }
      }
    }
    public isIndexed(property: string) {
      return property.match(this.index_regexp) != undefined;
    }
    public set(property: string, value: any) {
      var path = property.split(".");
      return this._setProperty(this.target, path, value);
    }
    public get(property: string) {
      var path = property.split(".");
      return this._getProperty(this.target || {}, path);
    }
    public properties() {
      var props = [];
      this._enumerate(props, this.target, "");
      return props;
    }
  };
  public static TypeRegistry = {
    'string': {
      format: function(value) {
        return value ? String(value) : '';
      },
      parse: function(value) {
        return value ? value : null;
      }
    },
    'stringArray': {
      format: function(value) {
        return value.join();
      },
      parse: function(value) {
        return value ? value.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*,\s*/) : [];
      }
    },
    'number': {
      format: function(value) {
        return value ? String(value) : '';
      },
      parse: function(value) {
        return value ? Number(value) : null;
      }
    },
    'boolean': {
      format: function(value) {
        if (value == null) {
          return '';
        }
        return String(value);
      },
      parse: function(value) {
        if (value) {
          value = value.toLowerCase();
          return "true" == value || "yes" == value;
        }
        return false;
      }
    }
  };
  public static FormBinder = class {

    public form: any;
    public accessor: any;
    public type_regexp: RegExp;

    public static bind(form: any, obj: any) {
      return new Binder.FormBinder(form, obj);
    }
    constructor(form, accessor?) {
      this.form = form;
      this.accessor = this._getAccessor(accessor);
      this.type_regexp = /type\[(.*)\]/;
    }
    public _isSelected(value: any, options: any[]) {
      if (Binder.Util.isArray(options)) {
        for (var i = 0; i < options.length; ++i) {
          if (value == options[i]) {
            return true;
          }
        }
      } else if (value != "on") {
        return value == options;
      } else {
        return Boolean(options);
      }
    }
    public _getType(element: any): string {
      if (element.className) {
        var m = element.className.match(this.type_regexp);
        if (m && m[1]) {
          return m[1];
        }
      }
      return "string";
    }
    public _format(path: string, value: any, element: any): string | string[] {
      var type = this._getType(element);
      var handler = Binder.TypeRegistry[type];
      if (type === 'stringArray') {
        return handler.format(value);
      }
      if (Binder.Util.isArray(value) && handler) {
        var nv = [];
        for (var i = 0; i < value.length; i++) {
          nv[i] = handler.format(value[i]);
        }
        return nv;
      }
      return handler ? handler.format(value) : String(value);
    }
    public _parse(path: string, value: any, element: any): string | string[] {
      var type = this._getType(element);
      var handler = Binder.TypeRegistry[type];
      if (Binder.Util.isArray(value) && handler) {
        var nv = [];
        for (var i = 0; i < value.length; i++) {
          nv[i] = handler.parse(value[i]);
        }
        return nv;
      }
      return handler ? handler.parse(value) : String(value);
    }
    public _getAccessor(obj: any) {
      if (obj == undefined) {
        return this.accessor || new Binder.PropertyAccessor(obj);
      } else if (obj instanceof Binder.PropertyAccessor) {
        return obj;
      }
      return new Binder.PropertyAccessor(obj);
    }
    public serialize(obj?: any) {
      var accessor = this._getAccessor(obj);
      for (var i = 0; i < this.form.elements.length; i++) {
        this.serializeField(this.form.elements[i], accessor);
      }
      return accessor.target;
    }
    public serializeField(element: any, obj: any) {
      var accessor = this._getAccessor(obj);
      var value;
      if (element.type == "radio" || element.type == "checkbox") {
        if (element.value != "" && element.value != "on") {
          value = this._parse(element.name, element.value, element);
          if (element.checked) {
            accessor.set(element.name, value);
          } else if (accessor.isIndexed(element.name)) {
            var values = accessor.get(element.name);
            values = Binder.Util.filter(values, function(item) {
              return item != value;
            });
            accessor.set(element.name, values);
          }
        } else {
          value = element.checked;
          accessor.set(element.name, value);
        }
      } else if (element.type == "select-one" || element.type == "select-multiple") {
        accessor.set(element.name, accessor.isIndexed(element.name) ? [] : undefined);
        for (var j = 0; j < element.options.length; j++) {
          var v = this._parse(element.name, element.options[j].value, element);
          if (element.options[j].selected) {
            accessor.set(element.name, v);
          }
        }
      } else {
        value = this._parse(element.name, element.value, element);
        accessor.set(element.name, value);
      }
    }
    public deserialize(obj: any) {
      var accessor = this._getAccessor(obj);
      for (var i = 0; i < this.form.elements.length; i++) {
        this.deserializeField(this.form.elements[i], accessor);
      }
      return accessor.target;
    }
    public deserializeField(element: any, obj: any) {
      var accessor = this._getAccessor(obj);
      var value = accessor.get(element.name);
      // do not deserialize undefined
      if (typeof value != 'undefined') {
        value = this._format(element.name, value, element);
        if (element.type == "radio" || element.type == "checkbox") {
          element.checked = this._isSelected(element.value, value);
        } else if (element.type == "select-one" || element.type == "select-multiple") {
          for (var j = 0; j < element.options.length; j++) {
            element.options[j].selected = this._isSelected(element.options[j].value, value);
          }
        } else {
          element.value = value;
        }
      }
    }
  };
}

export default Binder;
