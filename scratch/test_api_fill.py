import asyncio
import sys
from pathlib import Path
import httpx

async def test():
    base_url = "http://127.0.0.1:8001"
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # 1. Load demo
        print("1. Loading demo...")
        res = await client.post("/api/templates/demo")
        print("Demo response:", res.status_code)
        if res.status_code != 200:
            print(res.text)
            return
        data = res.json()
        form_id = data["schema"]["form_id"]
        source_id = data["source"]["source_id"]
        print(f"Form ID: {form_id}, Source ID: {source_id}")

        # 2. Start Fill
        print("2. Starting Fill...")
        res = await client.post("/api/fill", data={"form_id": form_id, "source_id": source_id})
        print("Fill start:", res.status_code, res.json())
        job_id = res.json()["job_id"]

        # 3. Poll Fill
        print("3. Polling Fill...")
        for _ in range(20):
            await asyncio.sleep(1)
            res = await client.get(f"/api/fill/{job_id}")
            st = res.json()
            print(f"  Job status: {st['status']}, done: {st['done']}/{st['total']}")
            if st["status"] in ("complete", "error"):
                break

        if st["status"] == "complete":
            vals = st.get("values", {})
            cits = st.get("citations", {})
            confs = st.get("conflicts", [])
            infs = st.get("inferences", {})
            print(f"\nSUCCESS!")
            print(f"Filled fields: {len(vals)}")
            print(f"Citations generated: {len(cits)}")
            print(f"Conflicts detected: {len(confs)}")
            print(f"Inferences made: {len(infs)}")

            # Print some citations
            print("\nSample Citations:")
            for k, cit in list(cits.items())[:3]:
                print(f"  Field [{k}]: val='{cit['value']}' | file: {cit['source_file']} (L{cit.get('line_number')}) -> \"{cit['snippet']}\"")

            print("\nSample Conflicts:")
            for conf in confs[:2]:
                print(f"  Field [{conf['field_id']}] ({conf['field_label']}): current='{conf['current_value']}'")
                for c in conf["candidates"]:
                    print(f"    - Candidate: '{c['value']}' from {c['source_file']} (L{c.get('line_number')}): \"{c['snippet']}\"")

            print("\nSample Inferences:")
            for k, inf in list(infs.items())[:2]:
                print(f"  Field [{k}]: inferred='{inf['value']}' | reason: {inf['reasoning']}")

if __name__ == "__main__":
    asyncio.run(test())
