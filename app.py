from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
import os
import PyPDF2
import docx
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

FASTDETECTGPT_API_URL = "https://api.fastdetect.net/api/detect"
FASTDETECTGPT_API_KEY = os.getenv("FASTDETECTGPT_API_KEY")

# Configure file upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_content):
    """Extract text from PDF file content"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")

def extract_text_from_docx(file_content):
    """Extract text from DOCX file content"""
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Error extracting text from DOCX: {str(e)}")

def extract_text_from_file(file_content, filename):
    """Extract text from uploaded file based on file type"""
    file_extension = filename.rsplit('.', 1)[1].lower()
    
    if file_extension == 'txt':
        try:
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    return file_content.decode(encoding).strip()
                except UnicodeDecodeError:
                    continue
            raise Exception("Unable to decode text file with common encodings")
        except Exception as e:
            raise Exception(f"Error reading text file: {str(e)}")
    elif file_extension == 'pdf':
        return extract_text_from_pdf(file_content)
    elif file_extension in ['docx', 'doc']:
        return extract_text_from_docx(file_content)
    else:
        raise Exception(f"Unsupported file type: {file_extension}")

# Use environment variable on Vercel

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Handle file upload and extract text for analysis"""
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file provided"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"success": False, "error": "Unsupported file type. Please upload .txt, .pdf, .docx, or .doc files only."}), 400
    
    try:
        # Read file content
        file_content = file.read()
        
        # Check file size
        if len(file_content) > MAX_FILE_SIZE:
            return jsonify({"success": False, "error": f"File too large. Maximum size allowed is {MAX_FILE_SIZE // (1024*1024)}MB"}), 400
        
        # Extract text from file
        extracted_text = extract_text_from_file(file_content, file.filename)
        
        if not extracted_text:
            return jsonify({"success": False, "error": "No text found in the uploaded file"}), 400
        
        # Check text length
        if len(extracted_text) > 20000:
            return jsonify({"success": False, "error": "Extracted text is too long. Maximum 20,000 characters allowed."}), 400
        
        return jsonify({
            "success": True,
            "text": extracted_text,
            "filename": file.filename,
            "text_length": len(extracted_text)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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
