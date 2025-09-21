from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

FASTDETECTGPT_API_URL = "https://api.fastdetect.net/api/detect"
FASTDETECTGPT_API_KEY = os.getenv("FASTDETECTGPT_API_KEY")

# Use environment variable on Vercel

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"success": False, "error": "No text provided."}), 400
    if not FASTDETECTGPT_API_KEY:
        return jsonify({"success": False, "error": "API key not configured."}), 500

    headers = {
        "Authorization": f"Bearer {FASTDETECTGPT_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "detector": "fast-detect(falcon-7b/falcon-7b-instruct)",
        "text": text
    }

    try:
        response = requests.post(FASTDETECTGPT_API_URL, headers=headers, json=payload, timeout=20)
        response.raise_for_status()
        result = response.json()

        if result.get("code") != 0:
            return jsonify({"success": False, "error": result.get("msg", "Unknown error")}), 500

        data = result.get("data", {})
        prob = data.get("prob", 0)
        crit = data.get("details", {}).get("crit", None)
        ntoken = data.get("details", {}).get("ntoken", None)

        prediction = "AI-generated" if prob > 0.4 else "Human-written"

        return jsonify({
            "success": True,
            "result": {
                "prediction": prediction,
                "probability": prob,
                "crit": crit,
                "ntoken": ntoken,
                "raw": data
            }
        })

    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
