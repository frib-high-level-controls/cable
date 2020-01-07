import { parse } from "path";

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
interface Bind {
    Util: {
        isFunction(obj: any): boolean;
        isArray(obj: any): boolean;
        isString(obj: any): boolean;
        isNumber(obj: any): boolean;
        isBoolean(obj: any): boolean;
        isDate(obj: any): boolean;
        isBasicType(obj: any): boolean;
        isNumeric(obj: any): boolean;
        filter(array: Array<any>, callback: Function): Array<any>;
    };
    TypeRegistry: {
        string: {
          format(value: any): string;
          parse(value: any): any;
        },
        stringArray: {
          format(value: Array<string>): string;
          parse(value: string): Array<string>;
        },
        number: {
          format(value: number): string;
          parse(value: any): number | null;
        },
        boolean: {
          format(value: any): string;
          parse(value: any): boolean;
      };
    }
    PropertyAccessor(obj: any): void;
    FormBinder(form, accessor?): void;
};

const Binder: Bind = {
    Util: {
        isFunction: function(obj) {
          return obj != undefined && typeof(obj) == "function" && typeof(obj.constructor) == "function" && obj.constructor.prototype.hasOwnProperty("call");
        },
        isArray: function(obj) {
          return obj != undefined && (obj instanceof Array || obj.construtor == "Array");
        },
        isString: function(obj) {
          return typeof(obj) == "string" || obj instanceof String;
        },
        isNumber: function(obj) {
          return typeof(obj) == "number" || obj instanceof Number;
        },
        isBoolean: function(obj) {
          return typeof(obj) == "boolean" || obj instanceof Boolean;
        },
        isDate: function(obj) {
          return obj instanceof Date;
        },
        isBasicType: function(obj) {
          return this.isString(obj) || this.isNumber(obj) || this.isBoolean(obj) || this.isDate(obj);
        },
        isNumeric: function(obj) {
          return this.isNumber(obj) || (this.isString(obj) && !isNaN(Number(obj)));
        },
        filter: function(array, callback) {
          const nv = [];
          for (let i = 0; i < array.length; i++) {
            if (callback(array[i])) {
              nv.push(array[i]);
            }
          }
          return nv;
        }
    },

    PropertyAccessor(obj) {
        this.target = obj || {};
        this.index_regexp = /(.*)\[(.*?)\]/;
    },


    TypeRegistry: {
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
    },
    FormBinder(form, accessor?) {
        this.form = form;
        this.accessor = this._getAccessor(accessor);
        this.type_regexp = /type\[(.*)\]/;
    }
};

Binder.FormBinder.prototype = {
  _isSelected: function(value, options) {
    if (Binder.Util.isArray(options)) {
      for (let i = 0; i < options.length; ++i) {
        if (value == options[i]) {
          return true;
        }
      }
    } else if (value != "on") {
      return value == options;
    } else {
      return Boolean(options);
    }
  },
  _getType: function(element) {
    if (element.className) {
      const m = element.className.match(this.type_regexp);
      if (m && m[1]) {
        return m[1];
      }
    }
    return "string";
  },
  _format: function(path, value, element) {
    const type = this._getType(element);
    const handler = Binder.TypeRegistry[type];
    if (type === 'stringArray') {
      return handler.format(value);
    }
    if (Binder.Util.isArray(value) && handler) {
      const nv = [];
      for (let i = 0; i < value.length; i++) {
        nv[i] = handler.format(value[i]);
      }
      return nv;
    }
    return handler ? handler.format(value) : String(value);
  },
  _parse: function(path, value, element) {
    const type = this._getType(element);
    const handler = Binder.TypeRegistry[type];
    if (Binder.Util.isArray(value) && handler) {
      const nv = [];
      for (let i = 0; i < value.length; i++) {
        nv[i] = handler.parse(value[i]);
      }
      return nv;
    }
    return handler ? handler.parse(value) : String(value);
  },
  _getAccessor: function(obj) {
    if (obj == undefined) {
      return this.accessor || new Binder.PropertyAccessor(obj);
    } else if (obj instanceof Binder.PropertyAccessor) {
      return obj;
    }
    return new Binder.PropertyAccessor(obj);
  },
  serialize: function(obj) {
    const accessor = this._getAccessor(obj);
    for (let i = 0; i < this.form.elements.length; i++) {
      this.serializeField(this.form.elements[i], accessor);
    }
    return accessor.target;
  },
  serializeField: function(element, obj) {
    const accessor = this._getAccessor(obj);
    let value;
    if (element.type == "radio" || element.type == "checkbox") {
      if (element.value != "" && element.value != "on") {
        value = this._parse(element.name, element.value, element);
        if (element.checked) {
          accessor.set(element.name, value);
        } else if (accessor.isIndexed(element.name)) {
          let values = accessor.get(element.name);
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
      for (let j = 0; j < element.options.length; j++) {
        const v = this._parse(element.name, element.options[j].value, element);
        if (element.options[j].selected) {
          accessor.set(element.name, v);
        }
      }
    } else {
      value = this._parse(element.name, element.value, element);
      accessor.set(element.name, value);
    }
  },
  deserialize: function(obj) {
    const accessor = this._getAccessor(obj);
    for (let i = 0; i < this.form.elements.length; i++) {
      this.deserializeField(this.form.elements[i], accessor);
    }
    return accessor.target;
  },
  deserializeField: function(element, obj) {
    const accessor = this._getAccessor(obj);
    let value = accessor.get(element.name);
    // do not deserialize undefined
    if (typeof value != 'undefined') {
      value = this._format(element.name, value, element);
      if (element.type == "radio" || element.type == "checkbox") {
        element.checked = this._isSelected(element.value, value);
      } else if (element.type == "select-one" || element.type == "select-multiple") {
        for (let j = 0; j < element.options.length; j++) {
          element.options[j].selected = this._isSelected(element.options[j].value, value);
        }
      } else {
        element.value = value;
      }
    }
  }
};
Binder.FormBinder.bind = function(form, obj) {
  return new Binder.FormBinder(form, obj);
};

export default Binder;