// Browser compatibility check for Gantt Chart Platform

(function() {
    'use strict';

    // Check if browser supports required features
    function checkBrowserSupport() {
        const errors = [];
        
        // Check for modern JavaScript features
        if (typeof Symbol === 'undefined') {
            errors.push('Symbol is not supported');
        }
        
        if (typeof Map === 'undefined') {
            errors.push('Map is not supported');
        }
        
        if (typeof Set === 'undefined') {
            errors.push('Set is not supported');
        }
        
        // Check for ES6 classes (optional with polyfill)
        try {
            eval('class TestClass {}');
        } catch (e) {
            console.warn('ES6 classes not supported, using polyfills');
        }
        
        // Check for localStorage
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            errors.push('localStorage is not available');
        }
        
        // Check for modern DOM features
        if (!document.querySelector) {
            errors.push('querySelector is not supported');
        }
        
        if (!document.addEventListener) {
            errors.push('addEventListener is not supported');
        }
        
        // Check for CSS Grid support (optional)
        if (!CSS.supports('display', 'grid')) {
            console.warn('CSS Grid is not supported, falling back to flexbox');
        }
        
        return errors;
    }
    
    // Display browser compatibility message
    function showBrowserMessage() {
        const errors = checkBrowserSupport();
        
        if (errors.length > 0) {
            const message = document.createElement('div');
            message.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #dc2626;
                color: white;
                padding: 20px;
                text-align: center;
                z-index: 10000;
                font-family: Arial, sans-serif;
            `;
            
            message.innerHTML = `
                <h3>Ваш браузер не поддерживается</h3>
                <p>Для работы платформы требуется современный браузер с поддержкой:</p>
                <ul style="text-align: left; max-width: 600px; margin: 0 auto;">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
                <p>Рекомендуемые браузеры: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+</p>
            `;
            
            document.body.appendChild(message);
            
            // Prevent app initialization
            window.browserNotSupported = true;
        }
    }
    
    // Check browser on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBrowserMessage);
    } else {
        showBrowserMessage();
    }
    
    // Make check function globally available
    window.checkBrowserSupport = checkBrowserSupport;
    
})();
