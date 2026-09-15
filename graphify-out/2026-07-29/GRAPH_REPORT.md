# Graph Report - .  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 444 nodes · 1310 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bd337242`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.ts
- requirePermission
- governance.ts
- MenuPlannerModule.tsx
- import_tech_cards.py
- devDependencies
- package.json
- App.tsx
- compilerOptions
- ProductHistoryModal.tsx
- cloudSync.ts
- vite-env.d.ts

## God Nodes (most connected - your core abstractions)
1. `requirePermission()` - 42 edges
2. `queryAll()` - 39 edges
3. `recordAudit()` - 38 edges
4. `MenuPlannerModule()` - 33 edges
5. `saveDatabaseToDisk()` - 32 edges
6. `SystemAdministrationPanel()` - 24 edges
7. `exportToPDF()` - 21 edges
8. `exportToExcel()` - 20 edges
9. `archiveRecord()` - 20 edges
10. `clean_text()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `exportToPDF()` --references--> `jspdf`  [EXTRACTED]
  src/services/export.ts → package.json
- `exportToExcel()` --references--> `xlsx`  [EXTRACTED]
  src/services/export.ts → package.json
- `App()` --calls--> `initDatabase()`  [EXTRACTED]
  src/App.tsx → src/services/db.ts
- `MenuPlannerModule()` --calls--> `getDishCostProfiles()`  [EXTRACTED]
  src/components/modules/MenuPlannerModule.tsx → src/services/db.ts
- `MenuPlannerModule()` --calls--> `getDishes()`  [EXTRACTED]
  src/components/modules/MenuPlannerModule.tsx → src/services/db.ts

## Import Cycles
- None detected.

## Communities (19 total, 2 thin omitted)

### Community 0 - "db.ts"
Cohesion: 0.06
Nodes (73): PROPERTY_CATEGORIES, PROPERTY_CONDITIONS, PropertyManagementModule(), WRITE_OFF_REASONS, StructureRegistryModule(), IMPORTED_TECH_CARDS, applyPropertyWriteOff(), base64ToBytes() (+65 more)

### Community 1 - "requirePermission"
Cohesion: 0.11
Nodes (59): DOCUMENT_LABELS, PrintableData, PrintCenterModule(), PrintDocumentType, today(), ProductsModule(), RecipeCatalogModule(), ReportRow (+51 more)

### Community 2 - "governance.ts"
Cohesion: 0.11
Nodes (49): SettingsModule(), ALL_PERMISSIONS, ALL_ROLES, formatDate(), Section, SECTION_ITEMS, SystemAdministrationPanel(), deleteInstitution() (+41 more)

### Community 3 - "MenuPlannerModule.tsx"
Cohesion: 0.09
Nodes (40): formatQty(), MEAL_TYPES, MenuPlannerModule(), ProductRequirementItem, translateCatName(), addCalendarDays(), buildMenuValidationIssues(), chooseDishReplacement() (+32 more)

### Community 4 - "import_tech_cards.py"
Cohesion: 0.17
Nodes (43): Any, Document, DocumentObject, Paragraph, Path, as_number(), as_total_mass(), build_metadata() (+35 more)

### Community 5 - "devDependencies"
Cohesion: 0.05
Nodes (38): autoprefixer, electron, electron-builder, { app, BrowserWindow, ipcMain }, ensureUserDatabase(), fs, getDatabasePath(), path (+30 more)

### Community 6 - "package.json"
Cohesion: 0.05
Nodes (39): html2canvas, jspdf, lucide-react, build, appId, directories, mac, productName (+31 more)

### Community 7 - "App.tsx"
Cohesion: 0.09
Nodes (23): App(), HeaderNavbar(), HeaderNavbarProps, AboutModule(), PortalHubModule(), PortalHubModuleProps, ProjectModuleItem, AGE_GROUPS (+15 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 9 - "ProductHistoryModal.tsx"
Cohesion: 0.60
Nodes (4): formatQty(), ProductHistoryModal(), ProductHistoryModalProps, getProductHistory()

## Knowledge Gaps
- **105 isolated node(s):** `{ app, BrowserWindow, ipcMain }`, `path`, `fs`, `{ contextBridge, ipcRenderer }`, `name` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exportToPDF()` connect `requirePermission` to `db.ts`, `MenuPlannerModule.tsx`, `package.json`, `App.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `exportToExcel()` connect `requirePermission` to `db.ts`, `MenuPlannerModule.tsx`, `package.json`, `App.tsx`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **What connects `{ app, BrowserWindow, ipcMain }`, `path`, `fs` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05939629990262902 - nodes in this community are weakly interconnected._
- **Should `requirePermission` be split into smaller, more focused modules?**
  _Cohesion score 0.10528846153846154 - nodes in this community are weakly interconnected._
- **Should `governance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11010558069381599 - nodes in this community are weakly interconnected._
- **Should `MenuPlannerModule.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09397163120567376 - nodes in this community are weakly interconnected._