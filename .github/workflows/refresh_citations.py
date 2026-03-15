import json, subprocess, re, os, urllib.request
from datetime import datetime, timezone

orcid_id = os.environ['ORCID_ID']
gist_id = os.environ['GIST_ID']
gist_token = os.environ['GIST_TOKEN']

# Load pre-fetched files
with open('/tmp/works_summary.json') as f:
    summary = json.load(f)
with open('/tmp/scholar.json') as f:
    scholar = json.load(f)

# Get put-codes from summary
put_codes = []
for group in summary.get('group', []):
    for ws in group.get('work-summary', []):
        pc = ws.get('put-code')
        if pc:
            put_codes.append(str(pc))

print(f"Found {len(put_codes)} works, fetching full details...")

# Keywords for the three known problematic papers
debug_titles = ['cold', 'qualification', 'thesis', 'dissertation', 'ramjet', 'master']

affiliations = {}
for pc in put_codes:
    result = subprocess.run(
        ['curl', '-s', '-H', 'Accept: application/json',
         f'https://pub.orcid.org/v3.0/{orcid_id}/work/{pc}'],
        capture_output=True, text=True
    )
    try:
        work = json.loads(result.stdout)
        desc = work.get('short-description') or ''
        title = work.get('title', {}).get('title', {}).get('value', '')
        ext_ids = work.get('external-ids', {}).get('external-id', [])
        doi = next((e['external-id-value'] for e in ext_ids if e['external-id-type'] == 'doi'), None)

        # Debug: print full description for problem papers
        if any(kw in title.lower() for kw in debug_titles):
            print(f"\n  DEBUG [{pc}] {title[:70]}")
            print(f"  desc repr: {repr(desc[-100:]) if len(desc) > 100 else repr(desc)}")

        match = re.search(r'Affiliation:\s*(\w+)', desc, re.IGNORECASE)
        if match:
            aff = match.group(1).upper()
            key = doi if doi else title.lower()[:60]
            affiliations[key] = aff
            print(f"  [{aff}] {title[:70]}")
        else:
            print(f"  [---] {title[:70]}")
            # Extra debug for any untagged paper - show last 50 chars of desc
            if desc:
                print(f"       tail: {repr(desc[-60:])}")
            else:
                print(f"       desc is EMPTY")
    except Exception as e:
        print(f"  Error on put-code {pc}: {e}")
        print(f"  Raw response: {result.stdout[:200]}")

# Scholar stats
cited_by = scholar.get('cited_by', {})
table = cited_by.get('table', [])
total_citations = h_index = i10_index = 0
for row in table:
    if 'citations' in row: total_citations = row['citations'].get('all', 0)
    if 'h_index' in row: h_index = row['h_index'].get('all', 0)
    if 'i10_index' in row: i10_index = row['i10_index'].get('all', 0)

# Per-paper citations
papers = {}
for article in scholar.get('articles', []):
    title = article.get('title', '')
    papers[title.lower()[:60]] = {
        'title': title,
        'citations': article.get('cited_by', {}).get('value', 0),
        'scholar_link': article.get('link', '')
    }

cache = {
    'updated': datetime.now(timezone.utc).isoformat(),
    'total_citations': total_citations,
    'h_index': h_index,
    'i10_index': i10_index,
    'papers': papers,
    'affiliations': affiliations
}

print(f"\nCache: {total_citations} citations, h-index {h_index}, {len(affiliations)} affiliations tagged")

# Update Gist
payload = json.dumps({
    'files': {'scholar_cache.json': {'content': json.dumps(cache, indent=2)}}
}).encode('utf-8')

req = urllib.request.Request(
    f'https://api.github.com/gists/{gist_id}',
    data=payload, method='PATCH',
    headers={
        'Authorization': f'token {gist_token}',
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-Actions'
    }
)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print(f"Gist updated at: {result.get('updated_at')}")
