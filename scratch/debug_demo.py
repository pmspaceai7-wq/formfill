import asyncio
import sys
import traceback
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path("backend").resolve()))

from app.main import load_demo

async def main():
    try:
        res = await load_demo()
        print("Success!", res.schema.form_id, res.source.source_id)
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
