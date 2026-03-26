import json

def format_sse(event: str, data: dict) -> str:
    """Format data as SSE event"""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"