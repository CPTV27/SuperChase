#!/bin/bash
# Setup script for SuperChase Agent Pipeline
# Run from /superchase directory

echo "Creating pipeline folder structure..."

# Per-venture folders
for venture in s2p bigmuddy studioc tuthill cptv utopia; do
  mkdir -p "clients/$venture/outputs"
  mkdir -p "clients/$venture/approved"
  mkdir -p "clients/$venture/published"
  mkdir -p "clients/$venture/archive/content"
  mkdir -p "clients/$venture/archive/records"
  mkdir -p "clients/$venture/archive/summaries"
  
  # Create .gitkeep files so empty folders are tracked
  touch "clients/$venture/outputs/.gitkeep"
  touch "clients/$venture/approved/.gitkeep"
  touch "clients/$venture/published/.gitkeep"
  touch "clients/$venture/archive/.gitkeep"
  
  echo "  ✓ $venture"
done

# Intelligence folders
mkdir -p "intelligence/research"
mkdir -p "intelligence/analysis"
touch "intelligence/.gitkeep"

echo ""
echo "✓ Pipeline structure created"
echo ""
echo "Folders per venture:"
echo "  /outputs   - Builder deliverables"
echo "  /approved  - Reviewer passed"
echo "  /published - Deployed to platforms"
echo "  /archive   - Historical records"
echo ""
echo "Next steps:"
echo "  1. Add tasks via Planner (Claude.ai or Venture Gallery)"
echo "  2. Run Builder agent (Claude Code with BUILDER_AGENT.md)"
echo "  3. Run Reviewer agent (REVIEWER_AGENT.md)"
echo "  4. Publish and Archive"
