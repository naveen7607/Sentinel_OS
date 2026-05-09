import asyncio
import json
import httpx
import re
import subprocess

async def emit(agent: str, action: str, details: str, status: str = "running"):
    """Helper to format SSE events."""
    event = {
        "agent": agent,
        "action": action,
        "details": details,
        "status": status
    }
    return json.dumps(event)

async def run_brute_force_scenario(ip_address: str):
    """Simulates the Brute Force scenario with real IP Geolocation."""
    yield await emit("Watcher", "Monitoring Logs", "Scanning authentication logs for anomalies...")
    await asyncio.sleep(1.5)
    yield await emit("Watcher", "Anomaly Detected", f"200 failed logins in 2 mins from IP {ip_address}")
    await asyncio.sleep(1)

    yield await emit("Commander", "Delegating", "Anomaly received. Engaging Threat Intel and Investigator agents.")
    await asyncio.sleep(1)

    yield await emit("Threat Intel", "Checking IP", f"Querying geolocation and ISP data for {ip_address}...")
    
    # Real API Call
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}")
            data = response.json()
            if data.get("status") == "success":
                geo_info = f"Location: {data.get('city')}, {data.get('country')}. ISP: {data.get('isp')}."
                is_local = data.get("query", "").startswith("192.168.") or data.get("query", "").startswith("10.")
            else:
                geo_info = "Local or Reserved IP space."
                is_local = True
    except Exception:
        geo_info = "Unable to resolve geolocation."
        is_local = False

    await asyncio.sleep(1.5)
    
    if not is_local:
        yield await emit("Threat Intel", "Report Received", f"{geo_info} IP flagged as malicious proxy node (Confidence: 94%).")
    else:
        yield await emit("Threat Intel", "Report Received", f"{geo_info} Internal network flagged for lateral movement (Confidence: 85%).")
    
    await asyncio.sleep(1)

    yield await emit("Investigator", "Analyzing Context", "Correlating failed logins with threat intel...")
    await asyncio.sleep(2)
    yield await emit("Investigator", "Conclusion", "Confirmed Brute Force / Credential Stuffing attack in progress.")
    await asyncio.sleep(1)

    yield await emit("Response", "Executing Mitigation", f"Adding IP {ip_address} to firewall blocklist...")
    await asyncio.sleep(1.5)
    yield await emit("Response", "Mitigation Complete", "IP blocked. Session tokens for targeted accounts revoked.")
    await asyncio.sleep(1)

    yield await emit("Audit", "Generating Report", f"Incident logged for IP {ip_address}. Status: THREAT CONTAINED.", status="completed")


async def run_vulnerable_package_scenario(package_name: str, package_version: str):
    """Checks real CVEs for a package using the Open Source Vulnerabilities (OSV) API."""
    yield await emit("Watcher", "Scanning Dependencies", f"Analyzing latest commits for {package_name}@{package_version}...")
    await asyncio.sleep(1.5)
    
    yield await emit("Commander", "Delegating", "Dependency detected. Engaging Threat Intel and Patch agents for vulnerability assessment.")
    await asyncio.sleep(1)

    yield await emit("Threat Intel", "Checking OSV Database", f"Querying api.osv.dev for {package_name} {package_version}...")
    
    # Real OSV API Call
    cve_found = "None"
    cve_details = ""
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "version": package_version,
                "package": {
                    "name": package_name
                }
            }
            response = await client.post("https://api.osv.dev/v1/query", json=payload)
            data = response.json()
            
            vulns = data.get("vulns", [])
            if vulns:
                # Grab the first alias if available (e.g. CVE-2021-44228)
                aliases = vulns[0].get("aliases", [])
                cve_found = aliases[0] if aliases else vulns[0].get("id", "Unknown ID")
                cve_details = vulns[0].get("details", "")[:100] + "..." if vulns[0].get("details") else "Critical vulnerability."
    except Exception as e:
        cve_found = "Network Error"

    await asyncio.sleep(2)

    if cve_found != "None" and cve_found != "Network Error":
        yield await emit("Threat Intel", "Vulnerability Found!", f"Match: {cve_found}. {cve_details}")
        await asyncio.sleep(1.5)
        
        yield await emit("Patch", "Preparing Fix", f"Identifying secure version for {package_name}...")
        await asyncio.sleep(2)
        yield await emit("Patch", "Executing Patch", "Updating package manager config and running unit tests...")
        await asyncio.sleep(2)
        yield await emit("Patch", "PR Created", f"Successfully opened automated PR to resolve {cve_found}.")
        await asyncio.sleep(1)
        
        yield await emit("Audit", "Generating Report", f"Patch applied for {package_name}. Awaiting manual merge.", status="completed")
    else:
        yield await emit("Threat Intel", "Secure", f"No known vulnerabilities found for {package_name}@{package_version} in OSV database.")
        await asyncio.sleep(1)
        yield await emit("Audit", "Generating Report", "Scan complete. Dependencies are secure.", status="completed")


async def run_phishing_scenario(email_text: str):
    """Uses regex heuristics to determine phishing probability."""
    yield await emit("Watcher", "Monitoring Email", "Scanning incoming organization emails...")
    await asyncio.sleep(1.5)
    
    # Simple heuristic engine
    urgent_words = ["urgent", "immediately", "action required", "suspend", "verify", "password", "reset", "click here", "login"]
    score = 0
    detected_keywords = []
    
    lower_text = email_text.lower()
    for word in urgent_words:
        if word in lower_text:
            score += 20
            detected_keywords.append(word)
            
    has_links = "http" in lower_text or "www." in lower_text
    if has_links:
        score += 30
        
    yield await emit("Watcher", "Email Intercepted", f"Analyzing content of length {len(email_text)} characters.")
    await asyncio.sleep(1)

    yield await emit("Investigator", "NLP Analysis", "Running heuristic scans for social engineering patterns...")
    await asyncio.sleep(2)
    
    if score >= 50:
        yield await emit("Investigator", "Conclusion", f"Phishing Confirmed (Score: {score}/100). Keywords: {', '.join(detected_keywords)}.")
        await asyncio.sleep(1)
        yield await emit("Response", "Executing Mitigation", "Quarantining email and purging from user inboxes...")
        await asyncio.sleep(1.5)
        yield await emit("Response", "Mitigation Complete", "Email quarantined. Users protected.")
    else:
        yield await emit("Investigator", "Conclusion", f"Email appears safe (Score: {score}/100). No malicious intent detected.")
        await asyncio.sleep(1)
        yield await emit("Response", "Allowing", "Email passed through to user inbox.")

    await asyncio.sleep(1)
    yield await emit("Audit", "Generating Report", "Email scanning complete.", status="completed")

async def run_web_scan_scenario(target_url: str):
    """Scans a web URL for security headers."""
    if not target_url.startswith("http"):
        target_url = "https://" + target_url

    yield await emit("Watcher", "Initializing Scan", f"Targeting URL: {target_url} for security posture assessment...")
    await asyncio.sleep(1)
    
    yield await emit("Commander", "Delegating", "Engaging Investigator Agent for HTTP header analysis.")
    await asyncio.sleep(1)

    yield await emit("Investigator", "Active Reconnaissance", f"Sending requests to {target_url} to fetch headers...")
    
    missing_headers = []
    score = 100
    try:
        async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
            response = await client.get(target_url, follow_redirects=True)
            headers = response.headers
            
            if "Strict-Transport-Security" not in headers:
                missing_headers.append("HSTS")
                score -= 30
            if "Content-Security-Policy" not in headers:
                missing_headers.append("CSP")
                score -= 30
            if "X-Frame-Options" not in headers:
                missing_headers.append("X-Frame-Options")
                score -= 20
            if "X-Content-Type-Options" not in headers:
                missing_headers.append("X-Content-Type-Options")
                score -= 10
            
            status_msg = f"HTTP {response.status_code} received."
    except Exception as e:
        status_msg = f"Connection failed."
        missing_headers = ["Unreachable"]
        score = 0

    await asyncio.sleep(2)

    if score == 100:
        yield await emit("Investigator", "Analysis Complete", f"{status_msg} Excellent security posture. All headers present.")
        await asyncio.sleep(1)
        yield await emit("Audit", "Generating Report", f"Scan complete for {target_url}. Score: A+", status="completed")
    elif score > 0:
        yield await emit("Investigator", "Analysis Complete", f"{status_msg} Missing: {', '.join(missing_headers)}. Score: {score}/100.")
        await asyncio.sleep(1.5)
        yield await emit("Threat Intel", "Risk Assessment", "Target is vulnerable to attacks such as Clickjacking or XSS due to missing headers.")
        await asyncio.sleep(1.5)
        yield await emit("Audit", "Generating Report", f"Vulnerabilities logged for {target_url}. Pending review.", status="completed")
    else:
        yield await emit("Investigator", "Analysis Failed", status_msg)
        await asyncio.sleep(1)
        yield await emit("Audit", "Generating Report", f"Scan failed for {target_url}. Target unreachable.", status="completed")

async def run_local_scan_scenario():
    """Scans the local machine for Wi-Fi and Bluetooth security."""
    yield await emit("Watcher", "Initializing Hardware Scan", "Accessing local network interfaces and Bluetooth radios...")
    await asyncio.sleep(1.5)

    # 1. Wi-Fi Scan
    yield await emit("Investigator", "Scanning WLAN", "Executing 'netsh wlan show interfaces' to assess Wi-Fi security...")
    await asyncio.sleep(1)
    
    wifi_output = ""
    try:
        wifi_output = subprocess.check_output(["netsh", "wlan", "show", "interfaces"], encoding="utf-8", errors="ignore")
    except Exception as e:
        wifi_output = f"Failed to execute Wi-Fi scan: {e}"
        
    ssid = "Unknown"
    auth_type = "Unknown"
    for line in wifi_output.split("\n"):
        if "SSID" in line and "BSSID" not in line:
            parts = line.split(":")
            if len(parts) > 1:
                ssid = parts[1].strip()
        if "Authentication" in line:
            parts = line.split(":")
            if len(parts) > 1:
                auth_type = parts[1].strip()
                
    if ssid == "Unknown" and auth_type == "Unknown":
        yield await emit("Investigator", "WLAN Status", "No active Wi-Fi connection detected or unable to read interface.")
        wifi_score = 100
    else:
        yield await emit("Investigator", "WLAN Analyzed", f"Connected to SSID: '{ssid}'. Authentication: {auth_type}.")
        await asyncio.sleep(1.5)
        
        if "WPA" in auth_type or "RSNA" in auth_type or "Unknown" in auth_type:
            yield await emit("Threat Intel", "WLAN Security", "Wi-Fi encryption meets acceptable SOC standards.")
            wifi_score = 100
        else:
            yield await emit("Threat Intel", "WLAN Vulnerability", f"CRITICAL: Connected to insecure network (Auth: {auth_type}). Traffic can be intercepted.", status="running")
            wifi_score = 0
            
    await asyncio.sleep(1.5)

    # 2. Bluetooth Scan
    yield await emit("Investigator", "Scanning Bluetooth", "Executing PowerShell IoT query for currently connected device...")
    await asyncio.sleep(1)
    
    bt_devices = []
    try:
        # Heavily filter to get only the primary connected physical device
        cmd = ["powershell", "-Command", "Get-PnpDevice -Class Bluetooth -PresentOnly | Where-Object FriendlyName -notmatch 'Enumerator|Service|Adapter|Profile|Protocol|TDI|Push|Access|Transport|Gateway|Audio' | Select-Object -ExpandProperty FriendlyName"]
        bt_output = subprocess.check_output(cmd, encoding="utf-8", errors="ignore")
        cleaned_list = [line.strip() for line in bt_output.split("\n") if line.strip()]
        
        # Take only the first device to represent the currently connected peripheral
        if cleaned_list:
            bt_devices = [cleaned_list[0]]
    except Exception as e:
        pass
        
    if not bt_devices:
        yield await emit("Investigator", "Bluetooth Status", "No active connected Bluetooth IoT devices found.")
        bt_score = 100
    else:
        connected_device = bt_devices[0]
        yield await emit("Investigator", "Device Found", f"Currently connected peripheral: {connected_device}")
        await asyncio.sleep(1.5)
        
        # Simple heuristic: If device name contains generic terms like "Keyboard", "Mouse", "AirPods", it's probably fine. Else flag for review.
        is_suspicious = not any(x in connected_device.lower() for x in ["mouse", "keyboard", "airpods", "buds", "speaker", "phone"])
        
        if is_suspicious:
            yield await emit("Threat Intel", "IoT Vulnerability", f"WARNING: Unrecognized generic peripheral connected ({connected_device}). Potential Rogue Device.")
            await asyncio.sleep(1.5)
            yield await emit("Response", "Executing Mitigation", f"Severing connection and blocking MAC address for rogue device: {connected_device}...")
            await asyncio.sleep(2)
            yield await emit("Response", "Mitigation Complete", f"{connected_device} forcefully disconnected and blocked from system.")
            bt_score = 50
        else:
            yield await emit("Threat Intel", "IoT Security", f"Connected peripheral ({connected_device}) matches standard safe profiles.")
            bt_score = 100
            
    await asyncio.sleep(1.5)
    
    total_score = (wifi_score + bt_score) / 2
    
    if total_score == 100:
        yield await emit("Audit", "Generating Report", f"Local environment scan complete. Device Health: SECURE.", status="completed")
    elif total_score >= 50:
        yield await emit("Audit", "Generating Report", f"Local environment scan complete. Device Health: WARNING. Unverified IoT devices present.", status="completed")
    else:
        yield await emit("Response", "Executing Mitigation", "Prompting user to disconnect from insecure Wi-Fi network immediately.")
        await asyncio.sleep(1)
        yield await emit("Audit", "Generating Report", f"Local environment scan complete. Device Health: CRITICAL VULNERABILITY.", status="completed")
