// Simple browser compatibility check for the Gantt Chart Platform

(function() {
    'use strict';

    // Check if browser supports required features
    function checkBrowserSupport() {
        var errors = [];
        
        // Check for localStorage (critical)
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            errors.push('localStorage is not available');
        }
        
        // Check for modern DOM features (critical)
        if (!document.querySelector) {
            errors.push('querySelector is not supported');
        }
        
        if (!document.addEventListener) {
            errors.push('addEventListener is not supported');
        }
        
        // Check for basic JavaScript features (critical)
        if (typeof Array.prototype.forEach === 'undefined') {
            errors.push('Array.forEach is not supported');
        }
        
        if (typeof JSON === 'undefined') {
            errors.push('JSON is not supported');
        }
        
        return errors;
    }
    
    // Display browser compatibility message only for critical errors
    function showBrowserMessage() {
        var errors = checkBrowserSupport();
        
        if (errors.length > 0) {
            var message = document.createElement('div');
            message.style.cssText = 
                'position: fixed;' +
                'top: 0;' +
                'left: 0;' +
                'right: 0;' +
                'background: #dc2626;' +
                'color: white;' +
                'padding: 20px;' +
                'text-align: center;' +
                'z-index: 10000;' +
                'font-family: Arial, sans-serif;';
            
            var errorsList = '';
            for (var i = 0; i < errors.length; i++) {
                errorsList += '<li>' + errors[i] + '</li>';
            }
            
            message.innerHTML = 
                '<h3>Ваш браузер не поддерживается</h3>' +
                '<p>Для работы платформы требуется современный браузер с поддержкой:</p>' +
                '<ul style="text-align: left; max-width: 600px; margin: 0 auto;">' +
                    errorsList +
                '</ul>' +
                '<p>Рекомендуемые браузеры: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+</p>';
            
            document.body.appendChild(message);
            
            // Prevent app initialization
            window.browserNotSupported = true;
        } else {
            // Browser is supported
            window.browserNotSupported = false;
            console.log('Browser compatibility check passed');
        }
    }
    
    // Check browser after a short delay to ensure polyfills are loaded
    function waitForPolyfills() {
        setTimeout(function() {
            showBrowserMessage();
        }, 200);
    }
    
    // Check browser on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForPolyfills);
    } else {
        waitForPolyfills();
    }
    
    // Make check function globally available
    window.checkBrowserSupport = checkBrowserSupport;
    
})();
