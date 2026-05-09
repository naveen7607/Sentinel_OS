import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.engine import run_brute_force_scenario, run_vulnerable_package_scenario, run_phishing_scenario, run_web_scan_scenario, run_local_scan_scenario

app = FastAPI(title="SentinelOS Backend")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "SentinelOS Active"}

class ScenarioRequest(BaseModel):
    scenario_type: str  # e.g., "brute_force", "vuln_package", "phishing"
    payload: dict = {}

@app.post("/api/scenario")
async def trigger_scenario(request: ScenarioRequest):
    async def event_generator():
        if request.scenario_type == "brute_force":
            ip = request.payload.get("ip_address", "192.168.1.105")
            async for event in run_brute_force_scenario(ip):
                yield f"data: {event}\n\n"
        elif request.scenario_type == "vuln_package":
            pkg = request.payload.get("package_name", "log4j")
            ver = request.payload.get("package_version", "2.14.1")
            async for event in run_vulnerable_package_scenario(pkg, ver):
                yield f"data: {event}\n\n"
        elif request.scenario_type == "phishing":
            text = request.payload.get("email_text", "Reset your password urgently")
            async for event in run_phishing_scenario(text):
                yield f"data: {event}\n\n"
        elif request.scenario_type == "web_scan":
            url = request.payload.get("target_url", "https://example.com")
            async for event in run_web_scan_scenario(url):
                yield f"data: {event}\n\n"
        elif request.scenario_type == "local_scan":
            async for event in run_local_scan_scenario():
                yield f"data: {event}\n\n"
        else:
            yield f"data: {{\"agent\": \"Commander\", \"action\": \"Error\", \"details\": \"Unknown scenario\", \"status\": \"completed\"}}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
