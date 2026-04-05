# Catalog Update Script Patterns

## Pattern 1: Apply decisions from exported JSON

```python
import json

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

with open('mnt/uploads/all_decisions.json') as f:
    decisions_data = json.load(f)

decisions  = {a['id']: a['status'] for a in decisions_data['assets']}
notes_map  = {a['id']: a['notes']  for a in decisions_data['assets']}

for asset in catalog['assets']:
    aid = asset['id']
    if aid in decisions:
        asset['decision']      = decisions[aid]
        asset['decisionNotes'] = notes_map.get(aid, '')

catalog['lastReviewDate'] = '2026-XX-XX'  # update date
with open('mnt/Potential/sprite-review/catalog.json', 'w') as f:
    json.dump(catalog, f, indent=2)
print('Done')
```

## Pattern 2: Add a batch of new assets

```python
import json

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

new_assets = [
    {
        "id": "bt_toilet",
        "name": "Toilet",
        "subcategory": "bathroom",
        "source": "free",
        "lpcPath": None,
        "sourceUrl": "https://opengameart.org/content/lpc-simple-modern-furniture",
        "license": "CC-BY-SA 3.0",
        "needsGeneration": False,
        "notes": "From LPC Simple Modern Furniture pack",
        "tags": ["bathroom", "plumbing"],
        "decision": "pending",
        "decisionNotes": ""
    },
    # add more assets here...
]

# Check for duplicate IDs
existing_ids = {a['id'] for a in catalog['assets']}
for a in new_assets:
    if a['id'] in existing_ids:
        print(f'WARNING: duplicate id {a["id"]}')
    else:
        catalog['assets'].append(a)

with open('mnt/Potential/sprite-review/catalog.json', 'w') as f:
    json.dump(catalog, f, indent=2)
print(f'Added {len(new_assets)} assets. Total: {len(catalog["assets"])}')
```

## Pattern 3: Fix LPC paths in bulk

```python
import json

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

# Map old filename → new filename (just the filename part, not full path)
fixes = {
    'Old Name (A).png': 'Old Name A.png',
    'Wrong Name.png': 'Correct Name.png',
}

fixed = 0
for asset in catalog['assets']:
    path = asset.get('lpcPath', '') or ''
    filename = path.split('/')[-1]
    if filename in fixes:
        folder = '/'.join(path.split('/')[:-1])
        asset['lpcPath'] = (folder + '/' if folder else '') + fixes[filename]
        asset['lpcPathFixed'] = True
        asset['lpcPathOld'] = path
        fixed += 1

print(f'Fixed {fixed} paths')
with open('mnt/Potential/sprite-review/catalog.json', 'w') as f:
    json.dump(catalog, f, indent=2)
```

## Pattern 4: Regenerate EMBEDDED_CATALOG in index.html

Always run this after any catalog.json change:

```python
import json, re

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

catalog_json = json.dumps(catalog)  # compact — no indent

with open('mnt/Potential/sprite-review/index.html') as f:
    html = f.read()

pattern = r'(const EMBEDDED_CATALOG = )\{.*?\}(?=;[\s\n])'
match = re.search(pattern, html, re.DOTALL)
if match:
    new_html = html[:match.start()] + f'const EMBEDDED_CATALOG = {catalog_json}' + html[match.end():]
    with open('mnt/Potential/sprite-review/index.html', 'w') as f:
        f.write(new_html)
    size_kb = len(new_html) // 1024
    print(f'Updated EMBEDDED_CATALOG. HTML is now {size_kb}KB')
else:
    print('ERROR: EMBEDDED_CATALOG pattern not found in index.html')
    print('Search manually for "const EMBEDDED_CATALOG" in the file')
```

## Pattern 5: Generate a gap summary

```python
import json
from collections import defaultdict

with open('mnt/Potential/sprite-review/catalog.json') as f:
    catalog = json.load(f)

assets = catalog['assets']
by_status = defaultdict(list)
for a in assets:
    by_status[a.get('decision', 'pending')].append(a)

print(f"Approved: {len(by_status['approved'])}")
print(f"Flagged:  {len(by_status['flagged'])}")
print(f"Rejected: {len(by_status['rejected'])}")
print(f"Pending:  {len(by_status['pending'])}")

gaps = [a for a in assets if a.get('source') == 'gap']
by_sub = defaultdict(list)
for a in gaps:
    by_sub[a['subcategory']].append(a['name'])
print(f"\nGap assets ({len(gaps)} total):")
for sub, names in sorted(by_sub.items()):
    print(f"  {sub}: {', '.join(names)}")
```
