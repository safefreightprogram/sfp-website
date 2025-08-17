// /js/sfp-config.js — central place for GAS endpoints (loaded on every page)
window.SFP_GAS_BASE = "https://script.google.com/macros/s/AKfycbwDQtLK_9q5gN_bkIDHFLLyvsB2dv1e8JUAG2jLODoJVVN5WOu7_4x_P50FRg4zmRLBWQ/exec";
window.SFP_ROLES_URL = `${window.SFP_GAS_BASE}?action=getRole`;

// CORRECTED: Match the exact action names from your GAS code
window.SFP_DRIVER_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=getDriverData`;     // Changed from driver_lookup
window.SFP_VEHICLE_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=getVehicleData`;   // Changed from vehicle_lookup
window.SFP_INSPECTION_SUBMIT_URL = `${window.SFP_GAS_BASE}?action=submitInspection`; // Changed from inspection_submit

// Additional endpoints available in your enhanced GAS:
window.SFP_UPDATE_PROFILE_URL = `${window.SFP_GAS_BASE}?action=updateProfile`;
window.SFP_GET_PROFILE_URL = `${window.SFP_GAS_BASE}?action=getProfile`;

// Helper function to make secure API calls with proper error handling
window.sfpApiCall = async function(action, params = {}) {
  try {
    const url = new URL(window.SFP_GAS_BASE);
    url.searchParams.set('action', action);
    
    // Add other parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    console.log(`🔗 Making SFP API call: ${action}`, params);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ SFP API response for ${action}:`, data);
    
    return data;
  } catch (error) {
    console.error(`❌ SFP API error for ${action}:`, error);
    throw error;
  }
};

// Quick test function to verify your GAS deployment
window.testSFPConnection = async function() {
  console.log('🧪 Testing SFP connection...');
  
  try {
    // Test basic connection with role check
    const roleResult = await sfpApiCall('getRole', { 
      email: 'safefreightprogram@gmail.com' 
    });
    console.log('✅ Role check successful:', roleResult);
    
    // Test driver lookup
    const driverResult = await sfpApiCall('getDriverData', { 
      id: 'SFPD-001234',
      email: 'safefreightprogram@gmail.com'
    });
    console.log('✅ Driver lookup successful:', driverResult);
    
    // Test vehicle lookup  
    const vehicleResult = await sfpApiCall('getVehicleData', { 
      id: 'SFPV-000001',
      email: 'safefreightprogram@gmail.com'
    });
    console.log('✅ Vehicle lookup successful:', vehicleResult);
    
    console.log('🎉 All SFP API tests passed!');
    return true;
    
  } catch (error) {
    console.error('💥 SFP connection test failed:', error);
    return false;
  }
};
