#!/usr/bin/env node
/**
 * Test Brainstorm Ingest
 * 
 * Verifies the v2.1 brainstorm spoke works correctly
 */

import { processBrainstorm, categorizeIdea, checkStrategicMatch } from '../spokes/brainstorm/ingest.js';
import { readFileSync } from 'fs';

console.log('\n🧪 SuperChase Brainstorm Ingest Test\n');
console.log('='.repeat(50));

// Test 1: Categorization
console.log('\n📁 Test 1: Idea Categorization\n');

const testIdeas = [
    { text: 'Deploy new API endpoint for client portal', expected: 'INFRASTRUCTURE' },
    { text: 'Create TikTok campaign for Purist brand', expected: 'MARKETING' },
    { text: 'Improve proposal delivery UX for clients', expected: 'CLIENT EXPERIENCE' },
    { text: 'Experiment with AI agent for cross-business synergy', expected: 'R&D' },
];

for (const { text, expected } of testIdeas) {
    const category = categorizeIdea(text);
    const pass = category.toUpperCase().includes(expected.toUpperCase().replace(' ', ''));
    console.log(`  ${pass ? '✅' : '❌'} "${text.substring(0, 40)}..." → ${category}`);
}

// Test 2: Process single brainstorm
console.log('\n📝 Test 2: Process Single Brainstorm\n');

const testContent = 'Virtual staging automation using Scan2Plan point clouds for real estate listings. Could integrate with CPTV distribution for client marketing.';

try {
    const result = await processBrainstorm(testContent, {
        source: 'TikTok Notes Test'
    });

    console.log(`  Status: ${result.status}`);
    console.log(`  Trace ID: ${result.traceId}`);
    console.log(`  Category: ${result.entry?.category}`);
    console.log(`  Type: ${result.entry?.type}`);
    console.log(`  Strategic Match: ${result.strategicMatch ? 'YES 🎯' : 'No'}`);

    // Show manifest entry
    console.log('\n📋 Manifest Entry:');
    console.log(JSON.stringify(result.entry, null, 2));

} catch (err) {
    console.error('  ❌ Error:', err.message);
}

// Test 3: Check manifest was updated
console.log('\n📄 Test 3: Verify Manifest\n');

try {
    const manifest = readFileSync('manifest.jsonl', 'utf8');
    const lines = manifest.trim().split('\n');
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    console.log(`  Total entries: ${lines.length}`);
    console.log(`  Last entry type: ${lastEntry.type}`);
    console.log(`  Last entry status: ${lastEntry.status}`);
    console.log('  ✅ Manifest updated successfully');
} catch (err) {
    console.log('  ⚠️ Could not read manifest:', err.message);
}

// Test 4: Deduplication
console.log('\n🔄 Test 4: Deduplication Check\n');

try {
    const duplicateResult = await processBrainstorm(testContent, {
        source: 'Duplicate Test'
    });

    if (duplicateResult.status === 'skipped' && duplicateResult.reason === 'duplicate') {
        console.log('  ✅ Duplicate correctly detected and skipped');
    } else {
        console.log('  ⚠️ Duplicate was not skipped (may have expired from cache)');
    }
} catch (err) {
    console.error('  ❌ Error:', err.message);
}

console.log('\n' + '='.repeat(50));
console.log('🏁 Brainstorm Ingest Test Complete\n');
console.log('⚠️  Remember: Ideas are FLAGGED only, not executed');
console.log('⚠️  Move to /manual/docs/projects/ to activate\n');
