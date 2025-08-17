// /js/sfp-config.js — central place for GAS endpoints (loaded on every page)
window.SFP_GAS_BASE = "https://script.google.com/macros/s/AKfycbwDQtLK_9q5gN_bkIDHFLLyvsB2dv1e8JUAG2jLODoJVVN5WOu7_4x_P50FRg4zmRLBWQ/exec";
window.SFP_ROLES_URL = `${window.SFP_GAS_BASE}?action=getRole`;

// Additional security endpoints now available with your enhanced GAS:
window.SFP_DRIVER_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=driver_lookup`;
window.SFP_VEHICLE_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=vehicle_lookup`;
window.SFP_INSPECTION_SUBMIT_URL = `${window.SFP_GAS_BASE}?action=inspection_submit`;
