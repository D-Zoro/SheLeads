import requests

url = "https://abc123.ngrok-free.app/generate"

data = {
    "text": "Explain Redis caching"
}

res = requests.post(url, json=data)

print(res.json())

if __name__ == "__main__":
    main()
