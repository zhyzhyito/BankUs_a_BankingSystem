import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[WARNING] Missing SUPABASE_URL or SUPABASE_KEY in environment variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def ensure_default_users():
    if not supabase:
        return

    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "adminpassword")
    client_password = os.getenv("DEFAULT_CLIENT_PASSWORD", "123456")

    default_users = [
        {"username": "zhyrus", "password": client_password, "role": "client", "balance": 15000.0, "status": "Active"},
        {"username": "admin", "password": admin_password, "role": "admin", "balance": 0.0, "status": "Active"}
    ]
    for u in default_users:
        try:
            supabase.table('users').upsert(u, on_conflict='username').execute()
        except Exception as e:
            print(f"[SUPABASE ERROR] Cannot sync {u['username']}: {e}")

def log_transaction(username, trans_type, amount, details=""):
    try:
        supabase.table('transactions').insert({
            "username": username,
            "type": trans_type,
            "amount": float(amount),
            "details": details,
            "created_at": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        print(f"[TRANSACTION LOG ERROR] {e}")

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'client')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    try:
        existing = supabase.table('users').select('*').eq('username', username).execute()
        if existing.data:
            return jsonify({"success": False, "message": "Username already taken"}), 400

        response = supabase.table('users').insert({
            "username": username,
            "password": password,
            "balance": 0.0,
            "role": role,
            "status": "Active"
        }).execute()
        
        if response.data:
            return jsonify({"success": True, "message": "Account registered successfully!", "user": response.data[0]})
        
        return jsonify({"success": False, "message": "Registration failed"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    try:
        response = supabase.table('users').select('*').eq('username', username).eq('password', password).execute()
        
        if response.data:
            user = response.data[0]
            if 'status' not in user or not user['status']:
                user['status'] = 'Active'
            return jsonify({"success": True, "message": "Login successful!", "user": user}), 200
        
        return jsonify({"success": False, "message": "Invalid username or password!"}), 401
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/clients', methods=['GET'])
def get_all_clients():
    try:
        res = supabase.table('users').select('*').eq('role', 'client').execute()
        return jsonify({"success": True, "clients": res.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/client/update', methods=['POST'])
def update_client_status():
    data = request.get_json() or {}
    old_username = data.get('old_username')
    new_username = data.get('new_username')
    new_password = data.get('new_password')
    new_balance = data.get('balance')
    new_status = data.get('status')

    target_username = old_username if old_username else data.get('username')

    try:
        user_res = supabase.table('users').select('*').eq('username', target_username).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "Client not found"}), 404

        update_payload = {}
        
        if new_username and new_username != target_username:
            existing = supabase.table('users').select('*').eq('username', new_username).execute()
            if existing.data:
                return jsonify({"success": False, "message": "Username already taken"}), 400
            update_payload["username"] = new_username

        if new_password:
            update_payload["password"] = new_password

        if new_balance is not None:
            update_payload["balance"] = float(new_balance)

        if new_status:
            update_payload["status"] = new_status

        res = supabase.table('users').update(update_payload).eq('username', target_username).execute()

        if res.data:
            return jsonify({"success": True, "message": "Client updated successfully!", "user": res.data[0]}), 200
        return jsonify({"success": False, "message": "Failed to update client"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/admin/client/delete', methods=['POST'])
def delete_client():
    data = request.get_json() or {}
    username = data.get('username')

    try:
        supabase.table('users').delete().eq('username', username).execute()
        return jsonify({"success": True, "message": f"Client {username} deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/client/deposit', methods=['POST'])
def deposit():
    data = request.get_json() or {}
    username = data.get('username')
    amount = float(data.get('amount', 0))

    if amount <= 0:
        return jsonify({"success": False, "message": "Invalid deposit amount"}), 400

    try:
        user_res = supabase.table('users').select('*').eq('username', username).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]
        if user.get('status') != 'Active':
            return jsonify({"success": False, "message": f"Account is {user.get('status')}. Transactions disabled."}), 403

        new_balance = float(user['balance']) + amount
        update_res = supabase.table('users').update({"balance": new_balance}).eq('username', username).execute()

        log_transaction(username, "Deposit", amount, "Cash Deposit")

        return jsonify({"success": True, "message": "Deposit successful!", "balance": new_balance}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/client/withdraw', methods=['POST'])
def withdraw():
    data = request.get_json() or {}
    username = data.get('username')
    amount = float(data.get('amount', 0))

    if amount <= 0:
        return jsonify({"success": False, "message": "Invalid withdrawal amount"}), 400

    try:
        user_res = supabase.table('users').select('*').eq('username', username).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]
        if user.get('status') != 'Active':
            return jsonify({"success": False, "message": f"Account is {user.get('status')}. Transactions disabled."}), 403

        current_balance = float(user['balance'])
        if current_balance < amount:
            return jsonify({"success": False, "message": "Insufficient balance!"}), 400

        new_balance = current_balance - amount
        supabase.table('users').update({"balance": new_balance}).eq('username', username).execute()

        log_transaction(username, "Withdrawal", amount, "Cash Withdrawal")

        return jsonify({"success": True, "message": "Withdrawal successful!", "balance": new_balance}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/client/transfer', methods=['POST'])
def transfer():
    data = request.get_json() or {}
    sender = data.get('sender')
    recipient = data.get('recipient')
    amount = float(data.get('amount', 0))

    if amount <= 0:
        return jsonify({"success": False, "message": "Invalid transfer amount"}), 400
    if sender == recipient:
        return jsonify({"success": False, "message": "Cannot transfer to yourself"}), 400

    try:
        sender_res = supabase.table('users').select('*').eq('username', sender).execute()
        if not sender_res.data:
            return jsonify({"success": False, "message": "Sender account error"}), 404
        
        sender_user = sender_res.data[0]
        if sender_user.get('status') != 'Active':
            return jsonify({"success": False, "message": f"Your account is {sender_user.get('status')}"}), 403

        if float(sender_user['balance']) < amount:
            return jsonify({"success": False, "message": "Insufficient balance"}), 400

        recip_res = supabase.table('users').select('*').eq('username', recipient).eq('role', 'client').execute()
        if not recip_res.data:
            return jsonify({"success": False, "message": f"Recipient '{recipient}' not found"}), 404

        recip_user = recip_res.data[0]

        new_sender_bal = float(sender_user['balance']) - amount
        new_recip_bal = float(recip_user['balance']) + amount

        supabase.table('users').update({"balance": new_sender_bal}).eq('username', sender).execute()
        supabase.table('users').update({"balance": new_recip_bal}).eq('username', recipient).execute()

        log_transaction(sender, "Transfer Out", amount, f"Sent to {recipient}")
        log_transaction(recipient, "Transfer In", amount, f"Received from {sender}")

        return jsonify({"success": True, "message": f"Successfully transferred ₱{amount:,.2f} to {recipient}!", "balance": new_sender_bal}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/client/history', methods=['POST'])
def get_history():
    data = request.get_json() or {}
    username = data.get('username')

    try:
        res = supabase.table('transactions').select('*').eq('username', username).order('created_at', desc=True).execute()
        return jsonify({"success": True, "history": res.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    ensure_default_users()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)