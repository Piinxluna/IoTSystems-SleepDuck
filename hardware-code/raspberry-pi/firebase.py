import firebase_admin
from firebase_admin import credentials
from firebase_admin import credentials, firestore
import os

firebase_credentials_file = os.path.join(os.path.dirname(__file__), 'Firebase', 'serviceAccountKey.json')

cred = credentials.Certificate(firebase_credentials_file)
firebase_admin.initialize_app(cred)
db = firestore.client()

print("Firebase Yay")