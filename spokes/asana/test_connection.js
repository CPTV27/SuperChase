#!/usr/bin/env node
/**
 * Asana Connection Test
 *
 * Verifies API token by fetching SC: Tasks project GID.
 * Usage: node spokes/asana/test_connection.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_WORKSPACE = process.env.ASANA_WORKSPACE_ID;
const ASANA_BASE_URL = 'https://app.asana.com/api/1.0';

async function testConnection() {
  console.log('\n=== Asana Connection Test ===\n');

  // Check credentials
  if (!ASANA_TOKEN || ASANA_TOKEN === 'NEEDS_VALUE') {
    console.log('❌ FAIL: ASANA_ACCESS_TOKEN not set');
    return { success: false, error: 'ASANA_ACCESS_TOKEN not set' };
  }

  if (!ASANA_WORKSPACE || ASANA_WORKSPACE === 'NEEDS_VALUE') {
    console.log('❌ FAIL: ASANA_WORKSPACE_ID not set');
    return { success: false, error: 'ASANA_WORKSPACE_ID not set' };
  }

  console.log('✓ Credentials present');

  // Test API connection by fetching user info
  console.log('  Fetching user info...');
  try {
    const userResponse = await fetch(`${ASANA_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${ASANA_TOKEN}` }
    });

    if (!userResponse.ok) {
      const error = await userResponse.json();
      console.log('❌ FAIL: User fetch failed');
      console.log(`   Error: ${error.errors?.[0]?.message || 'Unknown error'}`);
      return { success: false, error: error.errors?.[0]?.message };
    }

    const userData = await userResponse.json();
    console.log(`✓ Authenticated as: ${userData.data.name}`);

    // Fetch projects to find SC: Tasks
    console.log('  Fetching projects...');
    const projectsResponse = await fetch(
      `${ASANA_BASE_URL}/workspaces/${ASANA_WORKSPACE}/projects`,
      { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
    );

    if (!projectsResponse.ok) {
      const error = await projectsResponse.json();
      console.log('❌ FAIL: Projects fetch failed');
      console.log(`   Error: ${error.errors?.[0]?.message || 'Unknown error'}`);
      return { success: false, error: error.errors?.[0]?.message };
    }

    const projectsData = await projectsResponse.json();
    const projects = projectsData.data || [];

    console.log(`✓ Found ${projects.length} projects\n`);

    // Find SC: Tasks project
    const scTasks = projects.find(p => p.name === 'SC: Tasks');
    const superChaseLive = projects.find(p => p.name.toLowerCase().includes('superchase'));

    console.log('Key projects:');
    if (scTasks) {
      console.log(`  ✓ SC: Tasks (GID: ${scTasks.gid})`);
    } else {
      console.log('  - SC: Tasks not found');
    }

    if (superChaseLive) {
      console.log(`  ✓ ${superChaseLive.name} (GID: ${superChaseLive.gid})`);
    }

    // List first 5 projects
    console.log('\nAll projects:');
    projects.slice(0, 8).forEach(p => {
      console.log(`  - ${p.name} (${p.gid})`);
    });

    return {
      success: true,
      user: userData.data.name,
      projectCount: projects.length,
      scTasksGid: scTasks?.gid || null,
      superChaseLiveGid: superChaseLive?.gid || null
    };

  } catch (error) {
    console.log('❌ FAIL: Connection error');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run if called directly
const result = await testConnection();
console.log('\n' + JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
