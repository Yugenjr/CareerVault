from flask import Flask, request, jsonify
import os
import traceback
from PIL import Image
import numpy as np
import tensorflow as tf
app = Flask(__name__)
@app.route('/predict', methods=['POST'])
def predict():
    try:
        try:
            data = request.get_json(force=True)
        except Exception as json_err:
            print(f"[ML Service] JSON parse error: {json_err}")
            print(f"[ML Service] Raw body: {request.data}")
            return jsonify({'error': f'Invalid JSON: {str(json_err)}'}), 400
            
        file_path = data.get('file_path')
        debug = bool(data.get('debug', False))
        if not file_path:
            return jsonify({'error': 'file_path required'}), 400
        file_path = file_path.replace('\\', '/')
        
        # Accept absolute or relative paths
        if not os.path.isabs(file_path):
            file_path = os.path.abspath(file_path)

        if not os.path.exists(file_path):
            return jsonify({'error': f'file not found: {file_path}'}), 400

        # Import classifier and ensure resources are loaded
        from app.services import classifier
        classifier.load_resources()

        # Preprocess using a single fixed pipeline (RGB, 128x128, no normalization)
        def preprocess_image(image_path):
            img = Image.open(image_path).convert('RGB')
            img = img.resize((128, 128), resample=Image.BILINEAR)
            arr = np.asarray(img, dtype=np.float32)
            # Convert RGB -> BGR to align with classifier default
            arr = arr[..., ::-1]
            arr = np.expand_dims(arr, axis=0)
            return arr

        img = preprocess_image(file_path)

        model = getattr(classifier, '_MODEL', None)
        classnames = getattr(classifier, '_CLASSNAMES', None)
        if model is None or classnames is None:
            return jsonify({'error': 'Model not loaded'}), 500

        preds = model.predict(img)
        probs = tf.nn.softmax(preds[0]).numpy()
        idx = int(np.argmax(probs))
        confidence = float(probs[idx])
        label = str(classnames[idx]) if idx < len(classnames) else f'class_{idx}'

        resp = {'class': label, 'confidence': confidence}
        if debug:
            resp['probs'] = probs.tolist()
            resp['classnames'] = list(classnames)

        return jsonify(resp)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/memory/sync', methods=['POST'])
def memory_sync_endpoint():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        user_name = data.get('user_name', 'Unknown')
        doc_data = data.get('doc_data', {})
        
        if not user_id or not doc_data:
            return jsonify({'error': 'user_id and doc_data required'}), 400
            
        import asyncio
        from memory.memory_sync import memory_sync
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(
            memory_sync.process_document_memory(user_id, user_name, doc_data)
        )
        
        return jsonify({'success': success})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/memory/ask', methods=['POST'])
def memory_ask_endpoint():
    try:
        data = request.get_json(force=True)
        question = data.get('question')
        
        if not question:
            return jsonify({'error': 'question required'}), 400
            
        import asyncio
        from memory.memory_queries import memory_queries
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        context = loop.run_until_complete(
            memory_queries.get_assistant_context(question)
        )
        
        return jsonify({'context': context})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/memory/insights', methods=['GET'])
def memory_insights_endpoint():
    try:
        import asyncio
        from memory.memory_queries import memory_queries
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        insights = loop.run_until_complete(
            memory_queries.get_insights()
        )
        
        return jsonify(insights)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8001)))
