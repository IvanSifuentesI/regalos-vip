import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

for fname in [
    'parsed_extracted_4e4280d9-5718-435a-a4d8-0447f40369e7_content.txt.json',
    'parsed_extracted_f23909cf-ed63-48d4-ba5d-a2464a310200_content.txt.json',
    'extracted_868f43fd-ba8d-4909-89e5-a19d906efafe.htm.json',
    'extracted_e7e60d45-c3b8-4f9a-986e-6881a088b481.htm.json'
]:
    with open(fname, 'r', encoding='utf-8') as f:
        data = json.load(f)
    pp = data.get('props', {}).get('pageProps', {})
    print(f"\n=== FILE: {fname} ===")
    print("Page:", data.get('page'))
    if 'course' in pp and pp['course']:
        c = pp['course']
        print("Active course title:", c.get('title') or c.get('metadata', {}).get('title'))
        print("Course keys:", list(c.keys()))
        if 'sets' in c:
            print(f"Sets count: {len(c['sets'])}")
            for s in c['sets']:
                print(f"  Set: {s.get('name') or s.get('title') or s.get('metadata', {}).get('title')}")
                modules = s.get('modules', [])
                print(f"    Lessons count: {len(modules)}")
                for m in modules[:3]:
                    print(f"      Lesson: {m.get('name') or m.get('title') or m.get('metadata', {}).get('title')}")
    else:
        print("No active course in pageProps")
