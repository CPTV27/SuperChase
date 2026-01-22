/**
 * Vendor Status Workflow
 * Part of S2P Command Center
 *
 * Features:
 * - Track vendor status: Not Applied / Applied / Pending / Approved
 * - Calculate cycle time: (approval_date - application_date) in days
 * - Alert if pending > 45 days
 * - Auto-flag Tier-A leads without vendor status
 * - Store procurement contact per firm
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File paths
const VENDOR_DB_PATH = join(__dirname, '../../clients/s2p/memory/vendor-status.json');
const LEADS_PATH = join(__dirname, '../../clients/s2p/memory/leads.json');

// Vendor status constants
const VENDOR_STATUS = {
  NOT_APPLIED: 'not_applied',
  APPLIED: 'applied',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// SLA thresholds
const STALLED_THRESHOLD_DAYS = 45;  // Alert if pending > 45 days
const WARNING_THRESHOLD_DAYS = 30;  // Warning if pending > 30 days

/**
 * Load vendor status database
 */
async function loadVendorDB() {
  try {
    const data = await readFile(VENDOR_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      vendors: []
    };
  }
}

/**
 * Save vendor status database
 */
async function saveVendorDB(db) {
  db.lastUpdated = new Date().toISOString();
  await writeFile(VENDOR_DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Load leads database
 */
async function loadLeads() {
  try {
    const data = await readFile(LEADS_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.leads || [];
  } catch {
    return [];
  }
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Get vendor status for a lead
 * @param {string} leadId - Lead ID or firm name
 */
async function getVendorStatus(leadId) {
  const db = await loadVendorDB();
  return db.vendors.find(v =>
    v.leadId === leadId || v.firmName === leadId
  ) || null;
}

/**
 * Submit vendor application
 * @param {Object} data - Application data
 */
async function submitApplication(data) {
  const { leadId, firmName, applicationDate, procurementContact, notes } = data;

  if (!leadId && !firmName) {
    return { success: false, error: 'Lead ID or firm name required' };
  }

  const db = await loadVendorDB();

  // Check if already exists
  const existingIndex = db.vendors.findIndex(v =>
    v.leadId === leadId || v.firmName === firmName
  );

  const vendorRecord = {
    leadId,
    firmName,
    status: VENDOR_STATUS.APPLIED,
    applicationDate: applicationDate || new Date().toISOString(),
    procurementContact: procurementContact || null,
    approvalDate: null,
    cycleTimeDays: null,
    notes: notes || null,
    history: [{
      status: VENDOR_STATUS.APPLIED,
      date: new Date().toISOString(),
      action: 'Application submitted'
    }],
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    // Update existing
    db.vendors[existingIndex] = {
      ...db.vendors[existingIndex],
      ...vendorRecord,
      history: [
        ...db.vendors[existingIndex].history,
        ...vendorRecord.history
      ]
    };
  } else {
    // Add new
    db.vendors.push(vendorRecord);
  }

  await saveVendorDB(db);

  return {
    success: true,
    vendor: existingIndex >= 0 ? db.vendors[existingIndex] : vendorRecord
  };
}

/**
 * Update vendor status to pending
 */
async function markPending(leadId, notes) {
  const db = await loadVendorDB();

  const index = db.vendors.findIndex(v =>
    v.leadId === leadId || v.firmName === leadId
  );

  if (index === -1) {
    return { success: false, error: 'Vendor record not found' };
  }

  db.vendors[index].status = VENDOR_STATUS.PENDING;
  db.vendors[index].updatedAt = new Date().toISOString();
  db.vendors[index].history.push({
    status: VENDOR_STATUS.PENDING,
    date: new Date().toISOString(),
    action: 'Marked as pending review',
    notes
  });

  await saveVendorDB(db);

  return { success: true, vendor: db.vendors[index] };
}

/**
 * Approve vendor
 */
async function approveVendor(leadId, approvalDate, notes) {
  const db = await loadVendorDB();

  const index = db.vendors.findIndex(v =>
    v.leadId === leadId || v.firmName === leadId
  );

  if (index === -1) {
    return { success: false, error: 'Vendor record not found' };
  }

  const vendor = db.vendors[index];
  const appDate = approvalDate || new Date().toISOString();
  const cycleTime = vendor.applicationDate
    ? daysBetween(vendor.applicationDate, appDate)
    : null;

  vendor.status = VENDOR_STATUS.APPROVED;
  vendor.approvalDate = appDate;
  vendor.cycleTimeDays = cycleTime;
  vendor.updatedAt = new Date().toISOString();
  vendor.history.push({
    status: VENDOR_STATUS.APPROVED,
    date: new Date().toISOString(),
    action: 'Vendor approved',
    cycleTimeDays: cycleTime,
    notes
  });

  await saveVendorDB(db);

  return { success: true, vendor, cycleTimeDays: cycleTime };
}

/**
 * Reject vendor
 */
async function rejectVendor(leadId, reason) {
  const db = await loadVendorDB();

  const index = db.vendors.findIndex(v =>
    v.leadId === leadId || v.firmName === leadId
  );

  if (index === -1) {
    return { success: false, error: 'Vendor record not found' };
  }

  db.vendors[index].status = VENDOR_STATUS.REJECTED;
  db.vendors[index].updatedAt = new Date().toISOString();
  db.vendors[index].history.push({
    status: VENDOR_STATUS.REJECTED,
    date: new Date().toISOString(),
    action: 'Vendor rejected',
    reason
  });

  await saveVendorDB(db);

  return { success: true, vendor: db.vendors[index] };
}

/**
 * Get vendor alerts
 * Returns stalled applications and Tier-A leads without vendor status
 */
async function getVendorAlerts() {
  const [db, leads] = await Promise.all([
    loadVendorDB(),
    loadLeads()
  ]);

  const now = new Date();

  // Find stalled applications (pending > 45 days)
  const stalled = [];
  const warnings = [];

  for (const vendor of db.vendors) {
    if (vendor.status === VENDOR_STATUS.PENDING || vendor.status === VENDOR_STATUS.APPLIED) {
      const appDate = new Date(vendor.applicationDate);
      const daysWaiting = daysBetween(appDate, now);

      if (daysWaiting > STALLED_THRESHOLD_DAYS) {
        stalled.push({
          ...vendor,
          daysWaiting,
          alertLevel: 'critical'
        });
      } else if (daysWaiting > WARNING_THRESHOLD_DAYS) {
        warnings.push({
          ...vendor,
          daysWaiting,
          alertLevel: 'warning'
        });
      }
    }
  }

  // Find Tier-A leads without vendor status
  const vendorLeadIds = new Set(db.vendors.map(v => v.leadId));
  const vendorFirmNames = new Set(db.vendors.map(v => v.firmName));

  const needsApplication = leads.filter(lead => {
    const isTierA = lead.scoring?.tier === 'A';
    const hasVendor = vendorLeadIds.has(lead.id) || vendorFirmNames.has(lead.firmName);
    return isTierA && !hasVendor;
  }).map(lead => ({
    id: lead.id,
    firmName: lead.firmName,
    tier: lead.scoring?.tier,
    score: lead.scoring?.score,
    alertLevel: 'action-required'
  }));

  return {
    stalled,
    warnings,
    needsApplication,
    summary: {
      stalledCount: stalled.length,
      warningCount: warnings.length,
      needsAppCount: needsApplication.length,
      totalAlerts: stalled.length + warnings.length + needsApplication.length
    }
  };
}

/**
 * Get vendor status summary
 */
async function getVendorSummary() {
  const db = await loadVendorDB();

  const summary = {
    total: db.vendors.length,
    byStatus: {
      not_applied: 0,
      applied: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0
    },
    avgCycleTime: 0,
    approvedThisMonth: 0
  };

  let totalCycleTime = 0;
  let cycleTimeCount = 0;
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  for (const vendor of db.vendors) {
    summary.byStatus[vendor.status] = (summary.byStatus[vendor.status] || 0) + 1;

    if (vendor.cycleTimeDays) {
      totalCycleTime += vendor.cycleTimeDays;
      cycleTimeCount++;
    }

    if (vendor.status === VENDOR_STATUS.APPROVED && vendor.approvalDate) {
      const approvalDate = new Date(vendor.approvalDate);
      if (approvalDate.getMonth() === thisMonth && approvalDate.getFullYear() === thisYear) {
        summary.approvedThisMonth++;
      }
    }
  }

  summary.avgCycleTime = cycleTimeCount > 0
    ? Math.round(totalCycleTime / cycleTimeCount)
    : 0;

  return summary;
}

/**
 * Get all vendor records
 */
async function getAllVendors(filters = {}) {
  const db = await loadVendorDB();

  let vendors = db.vendors;

  if (filters.status) {
    vendors = vendors.filter(v => v.status === filters.status);
  }

  return {
    vendors,
    count: vendors.length
  };
}

export {
  getVendorStatus,
  submitApplication,
  markPending,
  approveVendor,
  rejectVendor,
  getVendorAlerts,
  getVendorSummary,
  getAllVendors,
  loadVendorDB,
  saveVendorDB,
  VENDOR_STATUS,
  STALLED_THRESHOLD_DAYS,
  WARNING_THRESHOLD_DAYS
};

export default {
  getVendorStatus,
  submitApplication,
  markPending,
  approveVendor,
  rejectVendor,
  getVendorAlerts,
  getVendorSummary,
  getAllVendors,
  loadVendorDB,
  saveVendorDB,
  VENDOR_STATUS,
  STALLED_THRESHOLD_DAYS,
  WARNING_THRESHOLD_DAYS
};
