#!/bin/bash
# SuperChase Task Status Dashboard
# Run from /superchase directory

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏛️  SUPERCHASE TASK DASHBOARD  $(date '+%Y-%m-%d %H:%M')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CLIENTS_DIR="./clients"

for venture_dir in "$CLIENTS_DIR"/*/; do
    venture=$(basename "$venture_dir")
    tasks_file="${venture_dir}tasks.json"
    
    if [ -f "$tasks_file" ]; then
        name=$(jq -r '.ventureName // .venture' "$tasks_file")
        goal_title=$(jq -r '.goal.title // "No goal"' "$tasks_file")
        target=$(jq -r '.goal.target // 0' "$tasks_file")
        current=$(jq -r '.goal.current // 0' "$tasks_file")
        strategy=$(jq -r '.strategy.label // "None"' "$tasks_file")
        intensity=$(jq -r '.strategy.intensity // "low"' "$tasks_file")
        
        pending=$(jq '[.features[] | select(.passes == false)] | length' "$tasks_file")
        completed=$(jq '[.features[] | select(.passes == true)] | length' "$tasks_file")
        total=$((pending + completed))
        
        p1=$(jq '[.features[] | select(.passes == false and .priority == "P1")] | length' "$tasks_file")
        p2=$(jq '[.features[] | select(.passes == false and .priority == "P2")] | length' "$tasks_file")
        
        # Calculate percentage
        if [ "$target" -gt 0 ]; then
            pct=$((current * 100 / target))
        else
            pct=0
        fi
        
        # Intensity indicator
        case $intensity in
            "low") int_icon="🟢" ;;
            "medium") int_icon="🟡" ;;
            "high") int_icon="🔴" ;;
            *) int_icon="⚪" ;;
        esac
        
        echo "┌─ $name"
        echo "│  Goal: $goal_title"
        echo "│  Progress: $current / $target ($pct%)"
        echo "│  Strategy: $int_icon $strategy"
        echo "│"
        echo "│  Tasks: $completed/$total complete"
        if [ "$p1" -gt 0 ]; then
            echo "│  🔴 P1: $p1 pending"
        fi
        if [ "$p2" -gt 0 ]; then
            echo "│  🟡 P2: $p2 pending"
        fi
        echo "└────────────────────────────────"
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Run 'jq .features[] clients/{venture}/tasks.json' for details"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
