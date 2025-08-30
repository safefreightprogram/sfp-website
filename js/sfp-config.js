// sfp-config.js - Complete Newsletter Integration
// Updated with correct GAS URL and improved error handling

window.SFP_CONFIG = {
    // Newsletter configuration
    newsletter: {
        // Most recent GAS deployment URL
        apiUrl: 'https://script.google.com/macros/s/AKfycbzLEhcBtlvPtW-760flAywHPooOMiz9-Ome7TVqzuUiiipN_uIsCdei8iZ7Zhku0bXH0w/exec',
        endpoints: {
            subscribe: 'newsletter_subscribe',
            confirm: 'newsletter_confirm',
            unsubscribe: 'newsletter_unsubscribe',
            unsubscribe_all: 'newsletter_unsubscribe_all'
        }
    },
    
    // Newsletter API helper function
    callNewsletterAPI: async function(action, data = {}) {
        try {
            console.log('Newsletter API call:', action, data);
            
            const url = this.newsletter.apiUrl;
            let response;
            
            // For GET requests (confirmation, unsubscribe)
            if (action === 'newsletter_confirm' || 
                action === 'newsletter_unsubscribe' || 
                action === 'newsletter_unsubscribe_all') {
                
                const params = new URLSearchParams({ action, ...data });
                response = await fetch(`${url}?${params}`, {
                    method: 'GET',
                    redirect: 'follow'
                });
                
            } else {
                // For POST requests (subscription)
                const formData = new URLSearchParams();
                formData.append('action', action);
                Object.keys(data).forEach(key => {
                    formData.append(key, data[key]);
                });
                
                response = await fetch(url, {
                    method: 'POST',
                    redirect: 'follow',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
            }
            
            // Parse response
            const text = await response.text();
            
            // Try to parse as JSON
            try {
                const result = JSON.parse(text);
                console.log('API Response:', result);
                return result;
            } catch (e) {
                // If not JSON, check for common HTML error responses
                if (text.includes('Script function not found')) {
                    throw new Error('Newsletter service configuration error. Please try again later.');
                }
                if (text.includes('Authorization required')) {
                    throw new Error('Newsletter service authorization error.');
                }
                
                // For HTML confirmation/unsubscribe pages, consider it success
                if (text.includes('Subscription Confirmed') || 
                    text.includes('Unsubscribed') ||
                    text.includes('successful')) {
                    return { 
                        success: true, 
                        message: 'Operation completed successfully',
                        isHtmlResponse: true 
                    };
                }
                
                // Log unexpected response for debugging
                console.warn('Unexpected response format:', text.substring(0, 200));
                
                // Default to success if we got a response
                return { 
                    success: true, 
                    message: 'Request processed. Please check your email.',
                    warning: 'Response format unexpected'
                };
            }
            
        } catch (error) {
            console.error('Newsletter API error:', error);
            
            // Network errors vs other errors
            if (error.message.includes('Failed to fetch')) {
                return { 
                    success: false, 
                    error: 'Unable to connect to newsletter service. Please check your connection and try again.' 
                };
            }
            
            return { 
                success: false, 
                error: error.message || 'An unexpected error occurred. Please try again.' 
            };
        }
    },
    
    // Test the newsletter connection
    testNewsletterConnection: async function() {
        console.log('🧪 Testing Newsletter connection...');
        try {
            const testUrl = `${this.newsletter.apiUrl}?action=ping`;
            const response = await fetch(testUrl, {
                method: 'GET',
                redirect: 'follow'
            });
            
            const text = await response.text();
            try {
                const result = JSON.parse(text);
                console.log('✅ Newsletter test result:', result);
                return { 
                    success: true, 
                    message: 'Newsletter service is connected',
                    data: result
                };
            } catch (e) {
                console.warn('⚠️ Newsletter test returned non-JSON:', text.substring(0, 100));
                return {
                    success: false,
                    error: 'Newsletter service returned unexpected format',
                    details: text.substring(0, 200)
                };
            }
        } catch (error) {
            console.error('❌ Newsletter test failed:', error);
            return { 
                success: false, 
                error: error.message || 'Connection test failed'
            };
        }
    },
    
    // Handle subscription form
    handleSubscriptionForm: async function(formElement) {
        const formData = new FormData(formElement);
        
        // Get selected segments
        const segments = [];
        if (formData.get('newsletter_pro') === 'on') segments.push('pro');
        if (formData.get('newsletter_driver') === 'on') segments.push('driver');
        
        // Validate segments
        if (segments.length === 0) {
            return {
                success: false,
                error: 'Please select at least one newsletter edition.'
            };
        }
        
        // Validate consent
        if (formData.get('consent') !== 'on') {
            return {
                success: false,
                error: 'Please accept the privacy policy to continue.'
            };
        }
        
        // Prepare subscription data
        const subscriptionData = {
            email: formData.get('email'),
            name: formData.get('name') || '',
            segment: segments.join(','),
            company: formData.get('company') || '',
            role: formData.get('role') || '',
            consent: 'true'
        };
        
        // Call the API
        return await this.callNewsletterAPI('newsletter_subscribe', subscriptionData);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('SFP Config loaded with newsletter URL:', window.SFP_CONFIG.newsletter.apiUrl);
    
    // Auto-test connection if on subscribe page
    if (window.location.pathname.includes('subscribe')) {
        window.SFP_CONFIG.testNewsletterConnection().then(result => {
            if (!result.success) {
                console.warn('Newsletter service test failed. Users may experience issues subscribing.');
            }
        });
    }
    
    // Attach to form if it exists
    const form = document.getElementById('newsletter-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = form.querySelector('button[type="submit"]');
            const statusDiv = document.getElementById('subscription-status');
            
            // Show loading state
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Subscribing...';
            }
            
            if (statusDiv) {
                statusDiv.className = 'mt-4 p-4 rounded-lg bg-blue-50 text-blue-700';
                statusDiv.textContent = 'Processing your subscription...';
                statusDiv.style.display = 'block';
            }
            
            // Process subscription
            const result = await window.SFP_CONFIG.handleSubscriptionForm(form);
            
            // Handle result
            if (result.success) {
                if (statusDiv) {
                    statusDiv.className = 'mt-4 p-4 rounded-lg bg-green-50 text-green-700';
                    statusDiv.innerHTML = `
                        <strong>Success!</strong> 
                        ${result.message || 'Please check your email to confirm your subscription.'}
                    `;
                }
                
                // Reset form
                form.reset();
                
                // Track event if analytics available
                if (typeof gtag !== 'undefined') {
                    const formData = new FormData(form);
                    const segments = [];
                    if (formData.get('newsletter_pro') === 'on') segments.push('pro');
                    if (formData.get('newsletter_driver') === 'on') segments.push('driver');
                    
                    gtag('event', 'newsletter_subscribe', {
                        'event_category': 'engagement',
                        'event_label': segments.join(',')
                    });
                }
            } else {
                if (statusDiv) {
                    statusDiv.className = 'mt-4 p-4 rounded-lg bg-red-50 text-red-700';
                    statusDiv.innerHTML = `
                        <strong>Error:</strong> 
                        ${result.error || 'Failed to process subscription. Please try again.'}
                    `;
                }
            }
            
            // Reset button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Subscribe';
            }
        });
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.SFP_CONFIG;
}
