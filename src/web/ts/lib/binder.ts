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

interface TypeDefinition {
  format(value: any): string;
  parse(value: string): any;
}

// tslint:disable:member-ordering prefer-for-of
export class Util {
  // tslint:disable:ban-types
  public static isFunction(obj: any): obj is Function {
    return obj !== undefined
            && typeof(obj) === 'function'
            && typeof(obj.constructor) === 'function'
            && obj.constructor.prototype.hasOwnProperty('call');
  }
  public static isArray(obj: any): obj is any[] {
    return obj !== undefined && obj !== null && (obj instanceof Array || obj.construtor === 'Array');
  }
  public static isString(obj: any): obj is string {
    return typeof(obj) === 'string' || obj instanceof String;
  }
  public static isNumber(obj: any): obj is number {
    return typeof(obj) === 'number' || obj instanceof Number;
  }
  public static isBoolean(obj: any): obj is boolean {
    return typeof(obj) === 'boolean' || obj instanceof Boolean;
  }
  public static isDate(obj: any): obj is Date {
    return obj instanceof Date;
  }
  public static isBasicType(obj: any): obj is string | number | boolean | Date {
    return this.isString(obj) || this.isNumber(obj) || this.isBoolean(obj) || this.isDate(obj);
  }
  public static isNumeric(obj: any): obj is number | string {
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
}

export class PropertyAccessor {
  public target: any;
  // tslint:disable:variable-name
  private index_regexp: RegExp;

  public static bindTo(obj: any): PropertyAccessor {
    return new PropertyAccessor(obj);
  }

  constructor(obj?: any) {
    this.target = obj || {};
    this.index_regexp = /(.*)\[(.*?)\]/;
  }

  private _setProperty(obj: any, path: string[], value: any): any {
    let current = path.shift();
    if (!current || obj === undefined) {
      return value;
    }
    const match = current.match(this.index_regexp);
    if (match) {
      const index = match[2];
      current = match[1];
      obj[current] = obj[current] || (Util.isNumeric(index) ? [] : {});
      if (index) {
        obj[current][index] = this._setProperty(obj[current][index] || {}, path, value);
      } else {
        const nv = this._setProperty({}, path, value);
        if (Util.isArray(nv)) {
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
  private _getProperty(obj: any, path: string[]): any {
    if (path.length === 0 || obj === undefined) {
      return obj;
    }
    let current = path.shift();
    if (current.indexOf('[') >= 0) {
      let match = current.match(this.index_regexp);
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
  private _enumerate(collection: string[], obj: any, path: string) {
    if (Util.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this._enumerate(collection, obj[i], path + '[' + i + ']');
      }
    } else if (Util.isBasicType(obj)) {
      collection.push(path);
    } else {
      for (const property in obj) {
        if (!Util.isFunction(property)) {
          this._enumerate(collection, obj[property], path === '' ? property : path + '.' + property);
        }
      }
    }
  }
  public isIndexed(property: string): boolean {
    return property.match(this.index_regexp) !== undefined;
  }
  public set(property: string, value: any): any {
    const path = property.split('.');
    return this._setProperty(this.target, path, value);
  }
  public get(property: string): any {
    const path = property.split('.');
    return this._getProperty(this.target || {}, path);
  }
  public properties(): string[] {
    const props: string[] = [];
    this._enumerate(props, this.target, '');
    return props;
  }
}

export const TypeRegistry: { [key: string]: TypeDefinition | undefined } = {
  string: {
    format(value: any) {
      return value ? String(value) : '';
    },
    parse(value: any) {
      return value ? value : null;
    },
  },
  stringArray: {
    format(value) {
      return value.join();
    },
    parse(value) {
      return value ? value.replace(/^(?:\s*,?)+/, '').replace(/(?:\s*,?)*$/, '').split(/\s*,\s*/) : [];
    },
  },
  number: {
    format(value) {
      return value ? String(value) : '';
    },
    parse(value) {
      return value ? Number(value) : null;
    },
  },
  boolean: {
    format(value) {
      if (value === null) {
        return '';
      }
      return String(value);
    },
    parse(value) {
      if (value) {
        value = value.toLowerCase();
        return 'true' === value || 'yes' === value;
      }
      return false;
    },
  },
};

export class FormBinder {

  public form: HTMLFormElement;
  public accessor: PropertyAccessor;
  public type_regexp: RegExp;

  public static bind(form: HTMLFormElement, obj: any) {
    return new FormBinder(form, obj);
  }

  constructor(form: HTMLFormElement, accessor?: any) {
    this.form = form;
    this.accessor = this._getAccessor(accessor);
    this.type_regexp = /type\[(.*)\]/;
  }
  public _isSelected(value: any, options: any[]) {
    if (Util.isArray(options)) {
      for (let i = 0; i < options.length; ++i) {
        if (value === options[i]) {
          return true;
        }
      }
    } else if (value !== 'on') {
      return value === options;
    } else {
      return Boolean(options);
    }
  }
  public _getType(element: HTMLElement): string {
    if (element.className) {
      const m = element.className.match(this.type_regexp);
      if (m && m[1]) {
        return m[1];
      }
    }
    return 'string';
  }
  private _format(path: string, value: any, element: any): string | string[] {
    const type = this._getType(element);
    const handler = TypeRegistry[type];
    if (type === 'stringArray' && handler) {
      return handler.format(value);
    }
    if (Util.isArray(value) && handler) {
      const nv = [];
      for (let i = 0; i < value.length; i++) {
        nv[i] = handler.format(value[i]);
      }
      return nv;
    }
    return handler ? handler.format(value) : String(value);
  }
  private _parse(path: string, value: any, element: any): string | string[] {
    const type = this._getType(element);
    const handler = TypeRegistry[type];
    if (Util.isArray(value) && handler) {
      const nv = [];
      for (let i = 0; i < value.length; i++) {
        nv[i] = handler.parse(value[i]);
      }
      return nv;
    }
    return handler ? handler.parse(value) : String(value);
  }
  private _getAccessor(obj?: any): PropertyAccessor {
    if (obj === undefined) {
      return this.accessor || new PropertyAccessor(obj);
    } else if (obj instanceof PropertyAccessor) {
      return obj;
    }
    return new PropertyAccessor(obj);
  }
  public serialize(obj?: any) {
    const accessor = this._getAccessor(obj);
    for (let i = 0; i < this.form.elements.length; i++) {
      this.serializeField(this.form.elements[i], accessor);
    }
    return accessor.target;
  }
  public serializeField(element: any, obj: any) {
    const accessor = this._getAccessor(obj);
    let value: string | string[];
    if (element.type === 'radio' || element.type === 'checkbox') {
      if (element.value !== '' && element.value !== 'on') {
        value = this._parse(element.name, element.value, element);
        if (element.checked) {
          accessor.set(element.name, value);
        } else if (accessor.isIndexed(element.name)) {
          let values = accessor.get(element.name);
          values = Util.filter(values, (item) => {
            return item !== value;
          });
          accessor.set(element.name, values);
        }
      } else {
        value = element.checked;
        accessor.set(element.name, value);
      }
    } else if (element.type === 'select-one' || element.type === 'select-multiple') {
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
  }
  public deserialize(obj?: any, blacklist?: string[]) {
    const accessor = this._getAccessor(obj);
    for (let i = 0; i < this.form.elements.length; i++) {
      const e: Element = this.form.elements[i];

      const classList = e.classList.value.split(' ');

      // skip hint fields
      if(blacklist && classList.some((r) => blacklist.indexOf(r) >= 0)) {
        continue;
      }

      this.deserializeField(this.form.elements[i], accessor);
    }
    return accessor.target;
  }
  public deserializeField(element: any, obj: any) {
    const accessor = this._getAccessor(obj);
    let value = accessor.get(element.name);
    // do not deserialize undefined
    if (typeof value !== 'undefined' && element.getAttribute('name') !== null) {
      value = this._format(element.name, value, element);
      if (element.type === 'radio' || element.type === 'checkbox') {
        element.checked = this._isSelected(element.value, value);
      } else if (element.type === 'select-one' || element.type === 'select-multiple') {
        for (let j = 0; j < element.options.length; j++) {
          element.options[j].selected = this._isSelected(element.options[j].value, value);
        }
      } else {
        element.value = value;
      }
    }
  }
}
