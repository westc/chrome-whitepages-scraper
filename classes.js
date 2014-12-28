/**
 * @license JS Classify (v1.1) - By Chris West - MIT License
 */
/**
 * Creates a class using the specified constructor and options.
 * @param  {!Function} constructor  The constructor function.
 * @param  {{ privateKey:string, setters:Array<string>, getters:Array<=string>, prototype:Object<!--Function-->, properties:Object, superClass:Function }} options
 *     Object containing the class options.  The privateKey is the name of the
 *     privateKey that will be assigned to every instance.  The setters array
 *     contains names of private data members for which setters will be setup.
 *     The getters array contains names of private data members for which
 *     getters will be setup.  The prototype object will contain the prototype
 *     values that will be attached to the class' prototype.  The superClass
 *     is the function that will act as the class' super class and all
 *     prototypes will be inherited from it.
 * @return {!Function}  The newly created class.
 */
var classify = (function(fakeClass) {
  var hasOwnProperty = {}.hasOwnProperty;
  
  function camelCase(str, delim) {
    delim = delim || ' ';
    var pos;
    while ((pos = str.indexOf(delim)) + 1) {
      str = str.slice(0, pos) + str.charAt(pos + 1).toUpperCase() + str.slice(pos + 2);
    }
    return str;
  }
  
  /**
   * Setup inheritance.
   * @param {!Function} baseClass  The base class from which the subclass
   *     inherits its prototypal values.
   * @param {!Function} subClass  Class which inherits from the base class.
   * @return {!Function}  The updated subclass.
   */
  function inherit(baseClass, subClass) {
    fakeClass.prototype = baseClass.prototype;
    var prototype = subClass.prototype = new fakeClass();
    prototype.superClass = baseClass;
    return prototype.constructor = subClass;
  }
  
  // Return classify function.
  return function(constructor, options) {
    var outerPrivateData;
  
    var privateKey = options.privateKey || '_';
  
    var realConstructor = function() {
      this[privateKey] = properties && hasOwnProperty.call(properties, privateKey)
        ? properties[privateKey]
        : {};
      if (superClass) {
        this.superClass = superClass;
      }
      try {
        return constructor.apply(this, arguments);
      }
      finally {
        if (superClass) {
          delete this.superClass;
        }
      }
    };
  
    // If the super-class is defined use it.
    var superClass = options.superClass;
    if (superClass) {
      realConstructor = inherit(superClass, realConstructor);
    }
  
    // Add class level properties.
    var properties = options.properties;
    if (properties) {
      for (var key in properties) {
        realConstructor[key] = properties[key];
      }
    }
  
    var realPrototype = realConstructor.prototype;
    var myPrototype = options.prototype || {};
  
    // Add getters.
    var getters = options.getters || [];
    for (var i = 0, len = getters.length; i < len; i++) {
      (function(name) {
        myPrototype[camelCase('get_' + name, '_')] = function() {
          return this[privateKey][name];
        };
      })(getters[i]);
    }
  
    // Add setters.
    var setters = options.setters || [];
    for (var i = 0, len = setters.length; i < len; i++) {
      (function(name) {
        myPrototype[camelCase('set_' + name, '_')] = function(newValue) {
          var privateData = this[privateKey];
          var oldValue = privateData[name];
          privateData[name] = newValue;
          return oldValue;
        };
      })(setters[i]);
    }
  
    // Add all prototypal values.
    for (var key in myPrototype) {
      realPrototype[key] = myPrototype[key];
    }
  
    return realConstructor;
  }
})(function(){});

/* Territory Class */
Territory = classify(
  function(name_or_obj, opt_num) {
    if (Object.prototype.toString.call(name_or_obj) == '[object String]') {
      this._.name = name_or_obj;
      this._.number = opt_num;
      this._.addresses = [];
    }
    else {
      this._.name = name_or_obj.name;
      this._.number = name_or_obj.number;
      this._.addresses = name_or_obj.addresses.map(function(address) {
        return new Address(address);
      });
    }
  },
  {
    getters: ['name', 'number', 'addresses'],
    setters: ['name', 'number', 'addresses'],
    prototype: {
      count: function() {
        return (this._.addresses || '').length;
      },
      toJSON: function() {
        return JSON.stringify(this.toObject());
      },
      toObject: function() {
        return {
          name: this._.name,
          number: this._.number,
          addresses: this._.addresses.map(function(address) {
            return address.toObject();
          })
        };
      }
    }
  }
);

/* Address Class */
Address = classify(
  function Address(num_or_obj, opt_street, opt_city, opt_region, opt_country, opt_details, opt_tags) {
    if (Object.prototype.toString.call(name_or_obj) == '[object Object]') {
      this._.number = num_or_obj.number;
      this._.street = num_or_obj.street;
      this._.city = num_or_obj.city;
      this._.region = num_or_obj.region;
      this._.country = num_or_obj.country;
      this._.details = num_or_obj.details;
      this._.tags = num_or_obj.tags;
    }
    else {
      this._.number = num_or_obj;
      this._.street = opt_street;
      this._.city = opt_city;
      this._.region = opt_region;
      this._.country = opt_country;
      this._.details = opt_details;
      this._.tags = opt_tags;
    }
  },
  {
    getters: ['number','street','city','region','country','details','tags'],
    setters: ['number','street','city','region','country','details','tags'],
    prototype: {
      toJSON: function() {
        return JSON.stringify(this.toObject());
      },
      toObject: function() {
        var ret = {
          number: this._number,
          street: this._street
        };
        Address.OPT_PROPS.forEach(function(prop) {
          if (this[prop]) {
            ret[prop] = this[prop];
          }
        });
        return ret;
      }
    },
    properties: {
      OPT_PROPS: [ 'city', 'region', 'country', 'details', 'tags']
    }
  }
);