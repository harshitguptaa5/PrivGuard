import sys
import os
from fastapi.testclient import TestClient

# Add local dir to path so we can import server
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from server import app
except ImportError as e:
    print(f"Error importing server: {e}")
    sys.exit(1)

client = TestClient(app)

def test_health():
    print("Testing /health...")
    response = client.get("/health")
    if response.status_code != 200:
        raise Exception(f"/health failed with status {response.status_code}: {response.text}")
    print("OK: /health")

def test_reset():
    print("Testing /reset...")
    response = client.post("/reset", json={"level": "easy"})
    if response.status_code != 200:
        raise Exception(f"/reset failed with status {response.status_code}: {response.text}")
    print("OK: /reset")

def test_step():
    print("Testing /step...")
    client.post("/reset", json={"level": "easy"})
    response = client.post("/step", json={"type": "keep", "token_index": 0})
    if response.status_code != 200:
        raise Exception(f"/step failed with status {response.status_code}: {response.text}")
    print("OK: /step")

def test_state():
    print("Testing /state...")
    response = client.get("/state")
    if response.status_code != 200:
        raise Exception(f"/state failed with status {response.status_code}: {response.text}")
    print("OK: /state")

def test_train():
    print("Testing /train...")
    response = client.post("/train", json={"episodes": 1, "level": "easy"})
    if response.status_code != 200:
        raise Exception(f"/train failed with status {response.status_code}: {response.text}")
    print("OK: /train")

if __name__ == "__main__":
    print("--- Starting Local Verification ---")
    try:
        test_health()
        test_reset()
        test_step()
        test_state()
        test_train()
        print("--- All tests passed! Server is robust enough for check. ---")
    except Exception as e:
        print(f"ERROR: Test failed: {str(e)}")
        sys.exit(1)
