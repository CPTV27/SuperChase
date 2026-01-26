---
task_id: s2p-004
venture: s2p
type: blog_post
created: 2026-01-26T12:30:00.000Z
author: builder-agent
status: ready_for_review
seo:
  primary_keyword: "point cloud to BIM workflow"
  secondary_keywords: ["scan to BIM", "point cloud processing", "as-built BIM", "reality capture workflow"]
  target_length: 2000-2500 words
---

# Point Cloud to BIM: The Complete Workflow Guide for AEC Professionals

*How raw scan data becomes the accurate Revit model your design team actually needs*

---

## Introduction

You've decided to use 3D scanning for your next renovation project. Smart move—laser scanning captures existing conditions faster and more accurately than any manual method.

But here's what most architects and engineers don't realize: **the scan is just the beginning.**

The real value comes from what happens after the field team packs up their equipment. The processing workflow—registration, cleanup, modeling, and QA—determines whether you get a dimensionally accurate BIM model or an expensive point cloud that sits unused on a server.

This guide walks through the complete point cloud to BIM workflow, from raw scan data to deliverable Revit model. Whether you're evaluating scanning vendors or trying to understand what you're actually paying for, this is the process that separates engineering-grade deliverables from marketing-grade visuals.

---

## The Workflow Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Field     │ →  │Registration │ →  │  Cleanup &  │ →  │    BIM      │ →  │     QA      │
│  Scanning   │    │ & Alignment │    │Optimization │    │  Modeling   │    │ & Delivery  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
    Day 1-2           Day 2-3            Day 3-4           Day 4-8           Day 8-10
```

Total timeline for a typical 10,000 SF project: **8-10 business days** from scan to deliverable.

Let's break down each phase.

---

## Phase 1: Field Scanning

### What Happens

A technician positions a terrestrial laser scanner at multiple locations throughout the building. At each position, the scanner captures millions of 3D coordinate points—typically 1-2 million points per second—creating a spherical "snapshot" of everything visible from that location.

### Key Variables

| Factor | Impact on Quality |
|--------|-------------------|
| **Scanner positions** | More positions = better coverage, fewer shadows |
| **Overlap between scans** | 30%+ overlap required for accurate registration |
| **Target placement** | Surveyed targets enable coordinate system alignment |
| **Environmental conditions** | Temperature, lighting, and movement affect accuracy |

### Equipment Matters

Not all scanners are equal. Here's how the major categories compare:

| Scanner Type | Typical Accuracy | Best Use Case |
|--------------|------------------|---------------|
| **Terrestrial (Leica, FARO)** | ±1-2mm at 10m | Engineering-grade BIM, precise measurements |
| **Handheld (NavVis, GeoSLAM)** | ±10-30mm | Large spaces, rapid capture, visual documentation |
| **Photogrammetry (Matterport)** | ±1-2% | Marketing, virtual tours, rough space planning |

**The takeaway:** If you need dimensions you can design to, terrestrial scanning is the only option that delivers engineering-grade accuracy.

[SCREENSHOT PLACEHOLDER: Side-by-side comparison of point density from terrestrial vs. handheld scanner]

---

## Phase 2: Registration & Alignment

### What Happens

Registration is the process of aligning multiple scan positions into a single, unified coordinate system. This is where raw scans become a cohesive point cloud—and where accuracy is won or lost.

### Two Approaches

**Target-Based Registration**
- Surveyed targets (spheres or checkerboards) placed throughout the space
- Software automatically identifies targets across overlapping scans
- Highest accuracy: ±1-3mm achievable
- Required for projects needing coordinate system alignment to site survey

**Cloud-to-Cloud Registration**
- Software matches overlapping geometry between adjacent scans
- No targets required—faster field setup
- Good accuracy: ±3-6mm typical
- Suitable for most interior renovation work

### The Registration Report

A quality scanning vendor provides a registration report documenting:

- **Mean registration error:** Should be <3mm for engineering-grade work
- **Maximum point deviation:** Identifies any problem areas
- **Target residuals:** Shows accuracy at each control point
- **Coordinate system definition:** Confirms alignment to project coordinates

**Red flag:** If your vendor can't provide a registration report, they can't verify their accuracy claims.

[SCREENSHOT PLACEHOLDER: Sample registration report showing target residuals and mean error]

---

## Phase 3: Cleanup & Optimization

### What Happens

Raw registered point clouds contain noise—people walking through scans, temporary objects, reflective surfaces causing artifacts, and overlapping data that bloats file sizes. Cleanup removes the noise while preserving the building geometry you need.

### Common Cleanup Tasks

| Issue | Solution |
|-------|----------|
| **People/furniture** | Manual deletion or automated filtering |
| **Reflective artifacts** | Point classification and removal |
| **Exterior bleed-through** | Clipping boundaries at building envelope |
| **Excessive density** | Intelligent downsampling (preserve edges) |
| **Coordinate outliers** | Statistical outlier removal |

### Optimization for Downstream Use

The cleaned point cloud gets optimized for its intended use:

- **Revit linking:** RCP/RCS format, segmented by floor
- **Navisworks clash detection:** E57 with coordinate alignment
- **Contractor access:** Potree web viewer or TruView
- **Archival:** Full-density E57 with metadata

File sizes matter. A raw 10,000 SF scan might be 15-20 GB. After cleanup and optimization, the working files are typically 2-5 GB—small enough to link into Revit without crashing.

[SCREENSHOT PLACEHOLDER: Before/after cleanup comparison showing artifact removal]

---

## Phase 4: BIM Modeling

### What Happens

This is where point clouds become the Revit model your design team uses. BIM technicians trace the point cloud, creating parametric building elements that match the as-built conditions.

### Level of Development (LOD)

LOD defines how much detail gets modeled. The right LOD depends on your project needs:

| LOD | What's Included | Typical Use Case |
|-----|-----------------|------------------|
| **LOD 200** | Walls, floors, roofs, major openings | Space planning, early design |
| **LOD 300** | All LOD 200 + doors, windows, stairs, columns | Design development, permit drawings |
| **LOD 350** | All LOD 300 + MEP routing, structural connections | Construction documents, coordination |

**Cost implications:** LOD 350 typically costs 1.5-2x more than LOD 200. Only specify what you need.

### Modeling Workflow

1. **Floor-by-floor approach:** Model each level as a separate workset
2. **Structural first:** Establish grid lines, bearing walls, columns
3. **Architectural envelope:** Exterior walls, floors, roofs
4. **Interior partitions:** Interior walls, rated assemblies
5. **Openings:** Doors, windows, skylights
6. **Vertical circulation:** Stairs, elevators, shafts
7. **MEP (if included):** Major routing, equipment locations

### The Point Cloud Stays Linked

The Revit model links the point cloud as a reference. This means:
- Design team can verify model against scan data
- Discrepancies are visible during coordination
- Point cloud serves as "ground truth" for disputes

[SCREENSHOT PLACEHOLDER: Revit model with linked point cloud visible, showing wall alignment]

---

## Phase 5: QA & Delivery

### What Happens

Before delivery, the model goes through quality assurance to verify accuracy and completeness. This is where the "engineering-grade" claim gets tested.

### Our 12-Point QA Protocol

1. **Registration verification:** Confirm mean error <3mm
2. **Coordinate system check:** Verify alignment to project coordinates
3. **Level accuracy:** Confirm floor-to-floor heights within tolerance
4. **Wall plumbness:** Check for modeled walls matching actual conditions
5. **Opening verification:** Spot-check door/window dimensions
6. **Structural alignment:** Verify columns and beams match point cloud
7. **Model organization:** Confirm worksets, phases, and naming conventions
8. **File performance:** Test Revit model responsiveness
9. **Point cloud linking:** Verify RCP links correctly in model
10. **Export testing:** Confirm DWG/IFC exports work correctly
11. **Deliverable completeness:** Check all requested outputs included
12. **Documentation:** Compile registration report, variance notes, delivery log

### Deliverables Package

A complete scan-to-BIM delivery includes:

| Deliverable | Format | Purpose |
|-------------|--------|---------|
| **Revit model** | .rvt | Primary design document |
| **Linked point cloud** | .rcp/.rcs | Reference verification |
| **2D CAD exports** | .dwg | Coordination with consultants |
| **Point cloud (archival)** | .e57 | Full-density backup |
| **Registration report** | .pdf | Accuracy documentation |
| **Variance notes** | .pdf | As-found conditions log |

---

## Point Cloud vs. Traditional Methods: The Comparison

| Factor | Traditional Survey | Point Cloud + BIM |
|--------|-------------------|-------------------|
| **Field time (10K SF)** | 3-5 days | 1-2 days |
| **Accuracy** | ±1/4" typical | ±3mm verified |
| **Hidden conditions** | Not captured | Visible in data |
| **Rework risk** | High (incomplete data) | Low (complete capture) |
| **Deliverable timeline** | 2-4 weeks | 8-10 business days |
| **Design coordination** | Manual overlay | Native BIM linking |
| **Cost** | $0.50-1.00/SF | $1.50-3.00/SF |

**The math:** Point cloud costs 2-3x more upfront but typically prevents 5-10x that amount in change orders on renovation projects.

---

## Common Mistakes to Avoid

### 1. Specifying the Wrong LOD
Don't pay for LOD 350 if you only need space planning. Don't cheap out on LOD 200 if you're doing MEP coordination.

### 2. Ignoring the Registration Report
If your vendor can't document their accuracy, they can't guarantee it. Always request registration reports.

### 3. Treating All Scanning as Equal
Matterport is not a substitute for terrestrial scanning on projects requiring dimensional accuracy. Know what you're getting.

### 4. Skipping the Point Cloud Link
Some teams delete the point cloud after modeling to save space. Keep it linked—you'll need it when questions arise during construction.

### 5. Not Defining Deliverables Upfront
"Scan-to-BIM" means different things to different vendors. Specify exactly what you need: LOD, disciplines, file formats, coordinate system.

---

## Questions to Ask Your Scanning Vendor

Before you hire, get clear answers to these questions:

1. **What scanner equipment do you use?** (Terrestrial vs. handheld matters)
2. **What's your typical registered accuracy?** (Should be <3mm for engineering work)
3. **Can you provide a registration report?** (If no, walk away)
4. **What LOD do you model to?** (Get specifics, not generalities)
5. **What's included in your deliverables?** (Get a written list)
6. **How do you handle as-found conditions?** (Variance notes are essential)
7. **What's your QA process?** (Should be documented and repeatable)

---

## Conclusion

Point cloud to BIM isn't magic—it's a defined workflow with measurable quality standards. The difference between a useful deliverable and an expensive data dump comes down to execution at each phase: proper field capture, accurate registration, thorough cleanup, skilled modeling, and rigorous QA.

When evaluating scanning vendors, look past the marketing and ask about the process. The firms delivering engineering-grade results can walk you through every step and document their accuracy at each phase.

That's what separates reality capture from real estate photography.

---

*Scan2Plan delivers engineering-grade scan-to-BIM services for AEC professionals across the Northeast. Have questions about point cloud workflows for your next project? [Contact us for a consultation.](https://scan2plan.dev)*

---

## Screenshot Requirements for Production

| Location | Description | Source |
|----------|-------------|--------|
| After "Equipment Matters" section | Side-by-side point density comparison | Production team to capture from recent project |
| After "The Registration Report" section | Sample registration report with residuals | Anonymized report from completed project |
| After "Optimization for Downstream Use" section | Before/after cleanup comparison | Production team screenshot |
| After "The Point Cloud Stays Linked" section | Revit model with visible point cloud | Production team screenshot from template |

---

## SEO Metadata

**Title Tag:** Point Cloud to BIM Workflow: Complete Guide for Architects & Engineers

**Meta Description:** Learn the complete point cloud to BIM workflow—from field scanning to Revit delivery. Understand registration, LOD specifications, and what separates engineering-grade from marketing-grade scanning.

**URL Slug:** /blog/point-cloud-to-bim-workflow-guide

**Internal Links:**
- Link to case study (s2p-001) in "Common Mistakes" section
- Link to services page in conclusion CTA
