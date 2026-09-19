import json

import lambda_handler


def function_url_event(method, path, body=None, headers=None):
    """A Lambda Function URL invocation (payload format 2.0)."""
    host = "abc123.lambda-url.ap-south-1.on.aws"
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"host": host, "x-forwarded-for": "203.0.113.7", "content-type": "application/json", **(headers or {})},
        "requestContext": {
            "accountId": "anonymous",
            "apiId": "abc123",
            "domainName": host,
            "domainPrefix": "abc123",
            "http": {
                "method": method,
                "path": path,
                "protocol": "HTTP/1.1",
                "sourceIp": "203.0.113.7",
                "userAgent": "pytest",
            },
            "requestId": "req-1",
            "routeKey": "$default",
            "stage": "$default",
            "time": "01/Jan/2026:00:00:00 +0000",
            "timeEpoch": 1767225600000,
        },
        "body": body,
        "isBase64Encoded": False,
    }


def test_health_through_the_lambda_entrypoint():
    response = lambda_handler.handler(function_url_event("GET", "/health"), None)
    assert response["statusCode"] == 200
    assert json.loads(response["body"])["status"] == "healthy"


def test_chat_post_through_the_lambda_entrypoint():
    event = function_url_event("POST", "/api/ai/chat", body=json.dumps({"message": "how do I recycle?"}))
    response = lambda_handler.handler(event, None)
    assert response["statusCode"] == 200
    assert json.loads(response["body"])["success"] is True


def test_cors_preflight_through_the_lambda_entrypoint():
    event = function_url_event("OPTIONS", "/api/ai/chat", headers={
        "origin": "https://ecocart-delta.vercel.app",
        "access-control-request-method": "POST",
    })
    response = lambda_handler.handler(event, None)
    assert response["statusCode"] == 200
    assert response["headers"]["access-control-allow-origin"] == "https://ecocart-delta.vercel.app"
