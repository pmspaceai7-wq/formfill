import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path("backend").resolve()))

from app.main import app

def test_full_pipeline():
    client = TestClient(app)

    # 1. Load demo
    print("1. Loading Demo...")
    res = client.post("/api/templates/demo")
    assert res.status_code == 200, f"Demo failed: {res.text}"
    demo_data = res.json()
    form_id = demo_data["schema"]["form_id"]
    source_id = demo_data["source"]["source_id"]
    print(f"   Created Form: {form_id}, Source: {source_id}")

    # 2. Start Fill
    print("2. Starting Fill...")
    res = client.post("/api/fill", data={"form_id": form_id, "source_id": source_id})
    assert res.status_code == 200, f"Fill start failed: {res.text}"
    job_id = res.json()["job_id"]
    print(f"   Fill Job ID: {job_id}")

    # 3. Poll Fill
    print("3. Checking Fill Job Status...")
    res = client.get(f"/api/fill/{job_id}")
    st = res.json()
    print(f"   Status: {st['status']}, done: {st['done']}/{st['total']}")

    vals = st.get("values", {})
    cits = st.get("citations", {})
    confs = st.get("conflicts", [])
    infs = st.get("inferences", {})

    print("\n==========================================")
    print("VERIFICATION RESULTS:")
    print(f"  * Total Fields Populated: {len(vals)}")
    print(f"  * Provenance Citations:   {len(cits)}")
    print(f"  * Conflicts Detected:     {len(confs)}")
    print(f"  * Smart Inferences Made:  {len(infs)}")
    print("==========================================")

    print("\n[PROVENANCE CITATIONS ON FORM FIELDS]")
    for fid, cit in list(cits.items())[:5]:
        print(f"  Field [{fid}] ({cit['fact_key']}): value='{cit['value']}'")
        print(f"    -> Source: {cit['source_file']} (Line {cit.get('line_number')})")
        print(f"    -> Snippet: \"{cit['snippet']}\"")
        print(f"    -> Confidence: {cit['confidence']} via {cit['method']}")

    print("\n[DETECTED CONFLICTS]")
    for conf in confs[:4]:
        print(f"  Field [{conf['field_id']}] ({conf['field_label']}): current='{conf['current_value']}'")
        for idx, c in enumerate(conf["candidates"], 1):
            print(f"    [{idx}] '{c['value']}' from {c['source_file']} (Line {c.get('line_number')}): \"{c['snippet']}\"")

    print("\n[SMART INFERENCES]")
    for fid, inf in list(infs.items())[:4]:
        print(f"  Field [{fid}]: value='{inf['value']}' | rule: {inf['rule_id']}")
        print(f"    -> Reasoning: {inf['reasoning']}")
        print(f"    -> Evidence: {inf['source_evidence']}")

if __name__ == "__main__":
    test_full_pipeline()
