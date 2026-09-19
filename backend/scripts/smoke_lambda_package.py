"""Invoke the Lambda handler with a Function URL event; exits non-zero on failure.

CI runs this from inside the built package (.aws-sam/build/ApiFunction) so it proves the
packaged dependencies import and serve a request under the same Python as the runtime.
"""
import json
import sys


def function_url_event(method: str, path: str) -> dict:
    host = "smoke.lambda-url.local"
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"host": host, "x-forwarded-for": "127.0.0.1"},
        "requestContext": {
            "accountId": "anonymous",
            "apiId": "smoke",
            "domainName": host,
            "domainPrefix": "smoke",
            "http": {"method": method, "path": path, "protocol": "HTTP/1.1",
                     "sourceIp": "127.0.0.1", "userAgent": "smoke-test"},
            "requestId": "smoke-1",
            "routeKey": "$default",
            "stage": "$default",
            "time": "01/Jan/2026:00:00:00 +0000",
            "timeEpoch": 1767225600000,
        },
        "isBase64Encoded": False,
    }


def main() -> int:
    import lambda_handler

    response = lambda_handler.handler(function_url_event("GET", "/health"), None)
    body = json.loads(response["body"])
    if response["statusCode"] != 200 or body.get("status") != "healthy":
        print(f"FAILED: {response}")
        return 1
    print(f"OK: python {sys.version.split()[0]}, /health -> {response['statusCode']} {body['status']}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, ".")
    sys.exit(main())
