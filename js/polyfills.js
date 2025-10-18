// Polyfills for older browsers compatibility

(function() {
    'use strict';

    // Polyfill for ES6 classes
    if (typeof Symbol === 'undefined') {
        window.Symbol = function Symbol(description) {
            return '__symbol_' + description + '_' + Math.random().toString(36).substr(2, 9);
        };
    }

    // Polyfill for Object.assign
    if (typeof Object.assign !== 'function') {
        Object.assign = function(target) {
            if (target == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            
            var to = Object(target);
            
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                
                if (nextSource != null) {
                    for (var nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        };
    }

    // Polyfill for Array.from
    if (!Array.from) {
        Array.from = function(arrayLike, mapFn, thisArg) {
            var C = this;
            var items = Object(arrayLike);
            var mapFunction = mapFn;
            var T = thisArg;
            var len = parseInt(items.length) || 0;
            var A = typeof C === 'function' ? Object(new C(len)) : new Array(len);
            var k = 0;
            var kValue;
            
            while (k < len) {
                kValue = items[k];
                if (mapFunction) {
                    A[k] = typeof T === 'undefined' ? mapFunction(kValue, k) : mapFunction.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            A.length = len;
            return A;
        };
    }

    // Polyfill for Array.includes
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement, fromIndex) {
            if (this == null) {
                throw new TypeError('Array.prototype.includes called on null or undefined');
            }
            
            var O = Object(this);
            var len = parseInt(O.length) || 0;
            if (len === 0) {
                return false;
            }
            
            var n = parseInt(fromIndex) || 0;
            var k = n >= 0 ? n : Math.max(len + n, 0);
            
            function sameValueZero(x, y) {
                return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
            }
            
            for (; k < len; k++) {
                if (sameValueZero(O[k], searchElement)) {
                    return true;
                }
            }
            return false;
        };
    }

    // Polyfill for Array.find
    if (!Array.prototype.find) {
        Array.prototype.find = function(predicate) {
            if (this == null) {
                throw new TypeError('Array.prototype.find called on null or undefined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            
            var list = Object(this);
            var length = parseInt(list.length) || 0;
            var thisArg = arguments[1];
            
            for (var i = 0; i < length; i++) {
                var value = list[i];
                if (predicate.call(thisArg, value, i, list)) {
                    return value;
                }
            }
            return undefined;
        };
    }

    // Polyfill for String.includes
    if (!String.prototype.includes) {
        String.prototype.includes = function(search, start) {
            if (typeof start !== 'number') {
                start = 0;
            }
            
            if (start + search.length > this.length) {
                return false;
            } else {
                return this.indexOf(search, start) !== -1;
            }
        };
    }

    // Polyfill for String.startsWith
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }

    // Polyfill for String.endsWith
    if (!String.prototype.endsWith) {
        String.prototype.endsWith = function(searchString, length) {
            if (length === undefined || length > this.length) {
                length = this.length;
            }
            return this.substring(length - searchString.length, length) === searchString;
        };
    }

    // Polyfill for Number.isNaN
    if (!Number.isNaN) {
        Number.isNaN = function(value) {
            return typeof value === 'number' && isNaN(value);
        };
    }

    // Polyfill for Number.isFinite
    if (!Number.isFinite) {
        Number.isFinite = function(value) {
            return typeof value === 'number' && isFinite(value);
        };
    }

    // Polyfill for Promise
    if (typeof Promise === 'undefined') {
        window.Promise = function(executor) {
            var self = this;
            self.state = 'pending';
            self.value = undefined;
            self.handlers = [];

            function resolve(result) {
                if (self.state === 'pending') {
                    self.state = 'fulfilled';
                    self.value = result;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }

            function reject(error) {
                if (self.state === 'pending') {
                    self.state = 'rejected';
                    self.value = error;
                    self.handlers.forEach(handle);
                    self.handlers = null;
                }
            }

            function handle(handler) {
                if (self.state === 'pending') {
                    self.handlers.push(handler);
                } else {
                    if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
                        handler.onFulfilled(self.value);
                    }
                    if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
                        handler.onRejected(self.value);
                    }
                }
            }

            this.then = function(onFulfilled, onRejected) {
                return new Promise(function(resolve, reject) {
                    handle({
                        onFulfilled: function(result) {
                            try {
                                resolve(onFulfilled ? onFulfilled(result) : result);
                            } catch (ex) {
                                reject(ex);
                            }
                        },
                        onRejected: function(error) {
                            try {
                                resolve(onRejected ? onRejected(error) : error);
                            } catch (ex) {
                                reject(ex);
                            }
                        }
                    });
                });
            };

            this.catch = function(onRejected) {
                return this.then(null, onRejected);
            };

            try {
                executor(resolve, reject);
            } catch (ex) {
                reject(ex);
            }
        };

        Promise.resolve = function(value) {
            return new Promise(function(resolve) {
                resolve(value);
            });
        };

        Promise.reject = function(error) {
            return new Promise(function(resolve, reject) {
                reject(error);
            });
        };

        Promise.all = function(promises) {
            return new Promise(function(resolve, reject) {
                var results = [];
                var remaining = promises.length;

                if (remaining === 0) {
                    resolve(results);
                }

                promises.forEach(function(promise, index) {
                    Promise.resolve(promise).then(function(result) {
                        results[index] = result;
                        remaining--;
                        if (remaining === 0) {
                            resolve(results);
                        }
                    }, reject);
                });
            });
        };
    }

    // Polyfill for Map
    if (typeof Map === 'undefined') {
        window.Map = function() {
            this.keys = [];
            this.values = [];
        };

        Map.prototype.set = function(key, value) {
            var index = this.keys.indexOf(key);
            if (index === -1) {
                this.keys.push(key);
                this.values.push(value);
            } else {
                this.values[index] = value;
            }
            return this;
        };

        Map.prototype.get = function(key) {
            var index = this.keys.indexOf(key);
            return index === -1 ? undefined : this.values[index];
        };

        Map.prototype.has = function(key) {
            return this.keys.indexOf(key) !== -1;
        };

        Map.prototype.delete = function(key) {
            var index = this.keys.indexOf(key);
            if (index !== -1) {
                this.keys.splice(index, 1);
                this.values.splice(index, 1);
                return true;
            }
            return false;
        };

        Map.prototype.clear = function() {
            this.keys = [];
            this.values = [];
        };

        Object.defineProperty(Map.prototype, 'size', {
            get: function() {
                return this.keys.length;
            }
        });
    }

    // Polyfill for Set
    if (typeof Set === 'undefined') {
        window.Set = function() {
            this.values = [];
        };

        Set.prototype.add = function(value) {
            if (this.values.indexOf(value) === -1) {
                this.values.push(value);
            }
            return this;
        };

        Set.prototype.has = function(value) {
            return this.values.indexOf(value) !== -1;
        };

        Set.prototype.delete = function(value) {
            var index = this.values.indexOf(value);
            if (index !== -1) {
                this.values.splice(index, 1);
                return true;
            }
            return false;
        };

        Set.prototype.clear = function() {
            this.values = [];
        };

        Object.defineProperty(Set.prototype, 'size', {
            get: function() {
                return this.values.length;
            }
        });
    }

    // Polyfill for Date.now
    if (!Date.now) {
        Date.now = function() {
            return new Date().getTime();
        };
    }

    // Polyfill for console methods (for very old browsers)
    if (typeof console === 'undefined') {
        window.console = {
            log: function() {},
            error: function() {},
            warn: function() {},
            info: function() {}
        };
    }

    // Polyfill for requestAnimationFrame
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback) {
            return window.setTimeout(function() {
                callback(Date.now());
            }, 1000 / 60);
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

    console.log('Polyfills loaded successfully');

})();
