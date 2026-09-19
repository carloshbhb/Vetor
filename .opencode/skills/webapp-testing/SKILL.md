---
name: webapp-testing
description: Toolkit for interacting with testing local web applications using Playwright. Use for verifying frontend functionality, debugging UI behavior, capturing screenshots, and viewing browser logs.
---

# Web Application Testing

Test local web applications using Python Playwright scripts.

## Decision Tree

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file directly to identify selectors
    │         ├─ Success → Write Playwright script using selectors
    │         └─ Fails/Incomplete → Treat as dynamic
    │
    └─ No (dynamic webapp) → Is the server already running?
        ├─ No → Start server, then write Playwright script
        └─ Yes → Reconnaissance-then-action:
            1. Navigate and wait for networkidle
            2. Take screenshot or inspect DOM
            3. Identify selectors from rendered state
            4. Execute actions with discovered selectors
```

## Example

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    # ... your automation logic
    browser.close()
```

## Best Practices

- Always wait for `networkidle` before inspection
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Close the browser when done
- Take screenshots for debugging

## When to Use

- Testing frontend functionality
- Debugging UI behavior
- Capturing browser screenshots
- Viewing browser console logs
- Automating web interactions
