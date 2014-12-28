(function(EMPTY_OBJECT, EMPTY_ARRAY, global, undefined) {
  var hasOwnProperty = EMPTY_OBJECT.hasOwnProperty;
  var arraySlice = EMPTY_ARRAY.slice;

  function typeOf(o, p) {
    o = o === global
      ? "global"
      : o == undefined
        ? o === undefined
          ? "undefined"
          : "null"
        : EMPTY_OBJECT.toString.call(o).slice(8, -1);
    return p ? p === o : o;
  }

  /**
   * @license JS Polling - By Chris West - MIT License
   */
  (function(emptyArr, types) {
    /**
     * Polls every so often until a specific condition is true before running the
     * fnOnReady function.
     * @param {!function():boolean} fnIsReady  The function that will be executed
     *     every time the amount of milliseconds (interval) specified passes.
     *     This function should return true if the fnOnReady parameter is ready to
     *     be executed, otherwise false should be returned.  The parameters passed
     *     to this function will be those specified as args.
     * @param {!Function} fnOnReady  The function to be run once the polling has
     *     ceased without a timeout.  The parameters passed to this function will
     *     be those specified as args.
     * @param {?Function=} fnOnTimeout  The optional function to be run once the
     *     polling ceased due to the timeout limit being reached.  The parameters
     *     passed to this function will be those specified as args.
     * @param {?number=} interval  The optional amount of milliseconds to wait
     *     before executing the fnIsReady function again.  If not specified, this
     *     interval will default to 50.
     * @param {?number=} timeout  The optional amount of milliseconds to wait
     *     until the polling should stop.  This doesn't include the amount of time
     *     used to run fnIsReady.  Defaults to infinity if not specified.
     * @param {?Array=} args  The optional array of arguments to send to the
     *     functions:  fnIsReady, fnOnReady, and fnOnTimeout.
     */
    poll = function(fnIsReady, fnOnReady, fnOnTimeout, interval, timeout, args) {
      // Pre-process the arguments to account for optionals.
      var type, myArg, myArgs = emptyArr.slice.call(arguments, 2);
      var i = -1;
      while(type = types[++i]) {
        myArg = myArgs[i];
        if(myArg != undefined && !typeOf(myArg, types[i])) {
          myArgs.splice(i, 0, undefined);
        }
      }
      fnOnTimeout = myArgs[0];
      interval = myArgs[1] || 50;
      timeout = myArgs[2] || Infinity;
      args = myArgs[3] || emptyArr;
       
      function fnCaller() {
        var me = this;
         
        if(fnIsReady.apply(me, args)) {
          fnOnReady.apply(me, args);
        }
        else if((timeout -= interval) > 0) {
          setTimeout(fnCaller, interval);
        }
        else if(fnOnTimeout) {
          fnOnTimeout.apply(me, args);
        }
      }
      fnCaller();
    }
  })([], ['Function', 'Number', 'Number', 'Array']);

  // Taken from an unpublished post on cwestblog.com
  var dom = (function(document, emptyArr, regExpDash, innerText, textContent, undefined) {
    function cap$1($0, $1) {
      return $1.toUpperCase();
    }
    
    var div = dom({nodeName:'DIV'});
    function dom(obj) {
      var elem;
      if (typeOf(obj, 'String')) {
        div.innerHTML = obj;
        elem = emptyArr.slice.call(div.childNodes, 0);
      }
      else {
        elem = document.createElement(obj.nodeName);
        for (var propName in obj) {
          var propValue = obj[propName];
          if (propName == 'style') {
            var style = elem[propName];
            if (typeOf(propValue, 'String')) {
              style.cssText = propValue;
            }
            else {
              for (var stylePropName in propValue) {
                if (hasOwnProperty.call(propValue, stylePropName)) {
                  style[stylePropName.replace(regExpDash, cap$1)] = propValue[stylePropName];
                }
              }
            }
          }
          else if (propName == innerText || propName == textContent) {
            elem[textContent] = elem[innerText] = propValue;
          }
          else if (propName == 'children') {
            if (!typeOf(propValue, 'Array')) {
              propValue = [propValue];
            }
            for (var i = 0, l = propValue.length; i < l; i++) {
              var child = dom(propValue[i]);
              if (!typeOf(child, 'Array')) {
                child = [child];
              }
              var kid, j = 0;
              while (kid = child[j++]) {
                elem.appendChild(kid);
              }
            }
          }
          else if (propName == 'for') {
            elem.htmlFor = propValue;
          }
          else if (propName != 'nodeName') {
            elem[propName] = propValue;
          }
        }
      }
      return elem;
    }

    return dom;
  })(document, [], /-([^-])/g, 'innerText', 'textContent');

  var jPaq = {
    compose: function(me, fn, arraysToParams, useReturnAsThis) {
      return function() {
        var ret = fn.apply(this, arguments),
          objThis = (useReturnAsThis && ret != undefined) ? ret : this;
        if(arraysToParams && jPaq.isArray(ret))
          return me.apply(objThis, ret);
        return me.call(objThis, ret);
      };
    },
    startsWith: function(me, str, ignoreCase) {
      return (ignoreCase ? me.toUpperCase() : me)
        .indexOf(ignoreCase ? str.toUpperCase() : str) == 0;
    },
    endsWith: function(me, str, ignoreCase) {
      return (ignoreCase ? me.toUpperCase() : me).slice(-str.length)
        == (ignoreCase ? str.toUpperCase() : str);
    },
    isIn: function(me, str, ignoreCase) {
      return (ignoreCase ? str.toUpperCase() : str)
        .indexOf(ignoreCase ? me.toUpperCase() : me) >= 0;
    },
    hasOwn: function(me, prop1) {
      for (var args = arguments, i = args.length; --i > 0;) {
        if (!hasOwnProperty.call(me, args[i])) {
          return false;
        }
      }
      return true;
    },
    typeOf: typeOf,
    parseCSV: function(strCSV, opt_headerRow, opt_delimiter, opt_fnProcessCell) {
      opt_delimiter = opt_delimiter || ',';
      var pattern = '([^"' + opt_delimiter + '\r\n]*|"((?:[^"]+|"")*)")(,|\r|\r?\n)';
      var colNames = [], isHeaderRow = opt_headerRow, rowCount = 0;
      var row = [], rows = opt_headerRow ? [] : [row], colIndex = 0;
      (strCSV + opt_delimiter).replace(new RegExp(pattern, 'g'), function(match, cell, quoted, delimiter) {
        cell = quoted ? quoted.replace(/""/g, '"') : cell;
        if (isHeaderRow) {
          colNames.push(cell);
        }
        else {
          row[opt_headerRow ? colNames[colIndex] : colIndex] = opt_fnProcessCell
            ? opt_fnProcessCell(cell, rowCount, colIndex, colNames[colIndex])
            : cell;
          colIndex++;
        }

        if (delimiter != opt_delimiter) {
          rowCount++;
          rows.push(row = opt_headerRow ? {} : []);
          colIndex = isHeaderRow = 0;
        }
      });
      return rows;
    },
    trackKeys: function(keys, callback) {
      var dict = {};
      var keysExpected = {};
      var keysLeft = 0;
      for (var key, i = keys.length; i--;) {
        if (hasOwnProperty.call(keysExpected, key = keys[i])) {
          throw new Error('"' + key + '" is already being tracked as a key');
        }
        keysExpected[key] = ++keysLeft;
      }

      return function(key, data) {
        if (!hasOwnProperty.call(keysExpected, key)) {
          throw new Error('"' + key + '" is a key that isn\'t being tracked')
        }
        if (hasOwnProperty.call(dict, key)) {
          throw new Error('"' + key + '" is a key that was already reported');
        }
        dict[key] = data;
        if (!--keysLeft) {
          callback(dict);
        }
      }
    },
    forOwn: function(obj, callback, opt_context) {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          callback.call(opt_context, obj[key], key, obj);
        }
      }
    },
    param: function(arrFields, callback) {
      for (var t, o = {}, defaults = [], len = arrFields.length, i = len; i--;) {
        t = o.toString.call(t = arrFields[i]) == '[object Array]' ? t : [t];
        defaults[i] = t[1];
        arrFields[i] = t[0];
      }

      return function(fields) {
        for (var t, args = arrFields.slice.call(arguments, 0), i = len; i--;) {
          args.unshift(fields && (o.hasOwnProperty.call(fields, t=arrFields[i]) ? fields[t] : defaults[i]));
        }
        return callback.apply(this, args);
      };
    },
    extend: function(objToExtend, objExtensions, override) {
      override = override === undefined || override;  // Defaults to true
      for (var key in objExtensions) {
        if (hasOwnProperty.call(objExtensions, key) && (override || hasOwnProperty.call(objToExtend, key))) {
          objToExtend[key] = objExtensions[key];
        }
      }
      return objToExtend;
    },
    curry: function(fn) {
      var args = arraySlice.call(arguments, 1);
      return function() {
        return fn.apply(this, args.concat(arraySlice.call(arguments)));
      };
    },
    /**
     * Converts an array of arrays with the sub-arrays containing [key,value] into an object.
     */
    kvToObject: function(arr) {
      return arr.reduce(function(ret, arrKV) {
        ret[arrKV[0]] = arrKV[1];
        return ret;
      }, {});
    },
    poll: poll,
    dom: dom
  };
  global.$JS = jPaq;
})({}, [], this);
