// Utility functions for the Gantt Chart Platform (ES5 compatible)

(function() {
    'use strict';

    // ES5 compatible Utils constructor
    function Utils() {}

    // Date utilities
    Utils.formatDate = function(date) {
        if (!date) return '';
        var d = new Date(date);
        return d.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    Utils.formatDateTime = function(date) {
        if (!date) return '';
        var d = new Date(date);
        return d.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    Utils.parseDate = function(dateString) {
        if (!dateString) return null;
        var date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    };

    Utils.addDays = function(date, days) {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    Utils.addWeeks = function(date, weeks) {
        return this.addDays(date, weeks * 7);
    };

    Utils.addMonths = function(date, months) {
        var result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    };

    Utils.getDaysBetween = function(startDate, endDate) {
        var timeDiff = endDate.getTime() - startDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    Utils.getWorkingDaysBetween = function(startDate, endDate, excludeWeekends) {
        excludeWeekends = excludeWeekends !== false;
        var days = 0;
        var current = new Date(startDate);
        
        while (current <= endDate) {
            if (!excludeWeekends || (current.getDay() !== 0 && current.getDay() !== 6)) {
                days++;
            }
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    };

    Utils.isWeekend = function(date) {
        var day = date.getDay();
        return day === 0 || day === 6;
    };

    Utils.isToday = function(date) {
        var today = new Date();
        return date.toDateString() === today.toDateString();
    };

    Utils.isHoliday = function(date, holidays) {
        holidays = holidays || [];
        for (var i = 0; i < holidays.length; i++) {
            var holidayDate = new Date(holidays[i]);
            if (holidayDate.toDateString() === date.toDateString()) {
                return true;
            }
        }
        return false;
    };

    // String utilities
    Utils.generateId = function(prefix) {
        prefix = prefix || '';
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    Utils.sanitizeHtml = function(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    Utils.truncateText = function(text, maxLength) {
        maxLength = maxLength || 50;
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    Utils.capitalizeFirst = function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Array utilities
    Utils.groupBy = function(array, key) {
        var groups = {};
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            var group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
        }
        return groups;
    };

    Utils.sortBy = function(array, key, direction) {
        direction = direction || 'asc';
        return array.sort(function(a, b) {
            var aVal = a[key];
            var bVal = b[key];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    };

    Utils.uniqueBy = function(array, key) {
        var seen = {};
        var result = [];
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            var value = item[key];
            if (!seen[value]) {
                seen[value] = true;
                result.push(item);
            }
        }
        return result;
    };

    Utils.flatten = function(array) {
        var result = [];
        for (var i = 0; i < array.length; i++) {
            var item = array[i];
            if (Array.isArray(item)) {
                var flattened = Utils.flatten(item);
                for (var j = 0; j < flattened.length; j++) {
                    result.push(flattened[j]);
                }
            } else {
                result.push(item);
            }
        }
        return result;
    };

    // Object utilities
    Utils.deepClone = function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) {
            var result = [];
            for (var i = 0; i < obj.length; i++) {
                result.push(Utils.deepClone(obj[i]));
            }
            return result;
        }
        if (typeof obj === 'object') {
            var clonedObj = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    };

    Utils.mergeDeep = function(target, source) {
        var result = {};
        
        // Copy target properties
        for (var key in target) {
            if (target.hasOwnProperty(key)) {
                result[key] = target[key];
            }
        }
        
        // Merge source properties
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = Utils.mergeDeep(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    };

    Utils.pick = function(obj, keys) {
        var result = {};
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (obj.hasOwnProperty(key)) {
                result[key] = obj[key];
            }
        }
        return result;
    };

    Utils.omit = function(obj, keys) {
        var result = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var shouldOmit = false;
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i] === key) {
                        shouldOmit = true;
                        break;
                    }
                }
                if (!shouldOmit) {
                    result[key] = obj[key];
                }
            }
        }
        return result;
    };

    // DOM utilities
    Utils.createElement = function(tag, className, textContent) {
        var element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    };

    Utils.addEventListeners = function(element, events) {
        for (var event in events) {
            if (events.hasOwnProperty(event)) {
                element.addEventListener(event, events[event]);
            }
        }
    };

    Utils.removeEventListeners = function(element, events) {
        for (var event in events) {
            if (events.hasOwnProperty(event)) {
                element.removeEventListener(event, events[event]);
            }
        }
    };

    Utils.debounce = function(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            var later = function() {
                clearTimeout(timeout);
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    Utils.throttle = function(func, limit) {
        var inThrottle;
        return function() {
            var args = arguments;
            var context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    };

    // Validation utilities
    Utils.validateEmail = function(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    Utils.validateDate = function(dateString) {
        var date = new Date(dateString);
        return !isNaN(date.getTime());
    };

    Utils.validateRequired = function(value) {
        return value !== null && value !== undefined && value !== '';
    };

    Utils.validateNumber = function(value, bit, max) {
        var num = Number(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    };

    // Color utilities
    Utils.hexToRgb = function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    Utils.rgbToHex = function(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    Utils.getContrastColor = function(hexColor) {
        var rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        var brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
    };

    Utils.generateColorPalette = function(count) {
        var colors = [];
        var hueStep = 360 / count;
        
        for (var i = 0; i < count; i++) {
            var hue = i * hueStep;
            colors.push('hsl(' + hue + ', 70%, 50%)');
        }
        
        return colors;
    };

    // File utilities
    Utils.downloadFile = function(content, filename, contentType) {
        contentType = contentType || 'text/plain';
        var blob = new Blob([content], { type: contentType });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    Utils.readFileAsText = function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = function(e) { reject(e); };
            reader.readAsText(file);
        });
    };

    Utils.readFileAsJson = function(file) {
        return this.readFileAsText(file).then(function(text) {
            return JSON.parse(text);
        });
    };

    // Local storage utilities
    Utils.saveToStorage = function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    };

    Utils.loadFromStorage = function(key, defaultValue) {
        defaultValue = defaultValue || null;
        try {
            var item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    };

    Utils.removeFromStorage = function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    };

    Utils.clearStorage = function() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    };

    // Error handling
    Utils.handleError = function(error, context) {
        context = context || '';
        console.error('Error ' + context + ':', error);
        
        var message = error.message || 'Произошла неизвестная ошибка';
        return {
            success: false,
            message: message,
            error: error
        };
    };

    Utils.tryCatch = function(fn, context) {
        context = context || '';
        try {
            var result = fn();
            return { success: true, result: result };
        } catch (error) {
            return this.handleError(error, context);
        }
    };

    Utils.tryCatchAsync = function(fn, context) {
        context = context || '';
        return fn().then(function(result) {
            return { success: true, result: result };
        }).catch(function(error) {
            return Utils.handleError(error, context);
        });
    };

    // Performance utilities
    Utils.measureTime = function(fn, label) {
        label = label || 'Operation';
        var start = performance.now();
        var result = fn();
        var end = performance.now();
        console.log(label + ' took ' + (end - start) + ' milliseconds');
        return result;
    };

    Utils.measureTimeAsync = function(fn, label) {
        label = label || 'Async Operation';
        var start = performance.now();
        return fn().then(function(result) {
            var end = performance.now();
            console.log(label + ' took ' + (end - start) + ' milliseconds');
            return result;
        });
    };

    // Animation utilities
    Utils.animate = function(element, properties, duration, easing) {
        duration = duration || 300;
        easing = easing || 'ease';
        
        return new Promise(function(resolve) {
            element.style.transition = 'all ' + duration + 'ms ' + easing;
            
            for (var prop in properties) {
                if (properties.hasOwnProperty(prop)) {
                    element.style[prop] = properties[prop];
                }
            }
            
            setTimeout(function() {
                element.style.transition = '';
                resolve();
            }, duration);
        });
    };

    Utils.fadeIn = function(element, duration) {
        duration = duration || 300;
        element.style.opacity = '0';
        element.style.display = 'block';
        return this.animate(element, { opacity: '1' }, duration);
    };

    Utils.fadeOut = function(element, duration) {
        duration = duration || 300;
        return this.animate(element, { opacity: '0' }, duration).then(function() {
            element.style.display = 'none';
        });
    };

    // Math utilities
    Utils.clamp = function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    };

    Utils.lerp = function(start, end, factor) {
        return start + (end - start) * factor;
    };

    Utils.roundToDecimal = function(value, decimals) {
        decimals = decimals || 2;
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    Utils.randomBetween = function(min, max) {
        return Math.random() * (max - min) + min;
    };

    Utils.randomIntBetween = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // Make Utils globally available
    window.Utils = Utils;

})();
